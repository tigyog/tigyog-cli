import * as fs from 'fs/promises';
import * as mime from 'mime-types';
import * as path from 'path';

import {
  apiPostVersion,
  apiPutDocPublishedVersionNumber,
} from './apiClient.js';
import { postCasFiles } from './casClient.js';
import { Ctx, fromMarkdownFile } from './markdownToDb.js';
import { getYAML, parseMarkdown } from './parseMarkdown.js';
import { tree } from './tree.js';

const publishMarkdownFile = async (ctx: Ctx): Promise<void> => {
  const reqBody = await fromMarkdownFile(ctx);
  const docId = reqBody.docId;
  const resp = await apiPostVersion(reqBody);
  if (!resp.ok) {
    throw new Error(
      `Could not post ${ctx.currentFilePath}, got errors: ` +
        JSON.stringify(resp.errors),
    );
  }
  const newVersionNumber = resp.versionNumber;
  const resp2 = await apiPutDocPublishedVersionNumber(docId, newVersionNumber);
  if (resp2) {
    console.log(
      'Published',
      ctx.currentFilePath,
      'as version',
      newVersionNumber,
    );
  } else {
    console.error('Could not publish', ctx.currentFilePath);
  }
};

const getMarkdownDocInfo = async (
  filepath: string,
): Promise<
  { type: 'course'; id: string } | { type: 'lesson'; id: string } | null
> => {
  const inStr = await fs.readFile(filepath, {
    encoding: 'utf8',
  });
  const root = parseMarkdown(inStr);
  const yaml = getYAML(root);
  const docId = yaml['id'];
  if (typeof docId === 'string') {
    if (yaml['type'] === 'course') {
      return { type: 'course', id: docId };
    } else {
      return { type: 'lesson', id: docId };
    }
  } else {
    return null;
  }
};

/*
Publishing logic must follow these ordering constraints:

* Before posting a chapter to the server, the course page must be posted, to ensure the course is created.
* Before posting a chapter/course page, all referenced images must be posted first, to get the image key to reference from content.
* Before generating a course page's content, we need the id of all chapter pages referenced, although they don't have to be posted to the server first.

Step 1: crawl the course directory, gathering:
  for the course page, the course id
  for each chapter page, the chapter id
  paths to all images referenced

Step 2: post images, get image keys. These can be done concurrently.

Step 3: post course page.

Step 4: post chapter pages. These can be done concurrently.
*/

export async function publishCommand({
  courseDir,
  courseId,
  dryRun = true,
}: {
  courseDir: string;
  courseId?: string | undefined;
  dryRun?: boolean;
}) {
  const expectedCourseIndexPath = path.join(courseDir, 'index.tigyog.md');

  let courseIndexPath: string | undefined;
  const imagePaths = [];
  const lessonPathsToIds: { [filePath: string]: string } = {};

  for await (const filepath of tree(courseDir)) {
    if (filepath.endsWith('.tigyog.md')) {
      const docInfo = await getMarkdownDocInfo(filepath);
      if (docInfo) {
        if (docInfo.type === 'course') {
          if (filepath === expectedCourseIndexPath) {
            courseIndexPath = filepath;
            courseId = docInfo.id;
          } else {
            console.warn(
              'Ignoring course file at non-standard filepath',
              filepath,
              '. To use it, move it to',
              expectedCourseIndexPath,
            );
          }
        } else {
          if (filepath === expectedCourseIndexPath) {
            console.warn(
              'Ignoring lesson file at course filepath',
              expectedCourseIndexPath,
              '. If you intended this to be your course homepage, add type:course to it.',
            );
          } else {
            lessonPathsToIds[filepath] = docInfo.id;
          }
        }
      } else {
        console.warn(
          'Ignoring Markdown file at path',
          filepath,
          '. Try running tigyog fmt first.',
        );
      }
    } else {
      const mimeType = mime.lookup(filepath);
      if (mimeType && mimeType.startsWith('image/')) {
        imagePaths.push(filepath);
      }
    }
  }

  if (courseId === undefined) {
    throw new Error(
      'Did not find course id! Pass a --course-id, or ensure course file is at ' +
        expectedCourseIndexPath +
        ' and has id. (Try running tigyog fmt)',
    );
  }
  const foundCourseId = courseId;

  if (dryRun) {
    console.log('Dry run.');
    console.log('Would have posted files at:', imagePaths);
    if (courseIndexPath)
      console.log('Would have posted course file at:', courseIndexPath);
    console.log(
      'Would have posted chapter files at:',
      Object.keys(lessonPathsToIds),
    );
    return;
  }

  // Here, we could crawl Markdown files here to restrict to only the subset of images that are actually referenced.
  // But on the assumption that this is a dedicated course directory, images should only be here if they're referenced by something.
  const imagePathsToKeys = await postCasFiles(imagePaths);

  // Publish course file first, to ensure course is created before posting any chapters.
  // It's okay for the course file to reference chapters that have not yet been uploaded.
  if (courseIndexPath) {
    await publishMarkdownFile({
      currentFilePath: courseIndexPath,
      imagePathsToKeys,
      courseId: foundCourseId,
      lessonPathsToIds,
    });
  }

  await Promise.all(
    Object.keys(lessonPathsToIds).map((lessonPath) =>
      publishMarkdownFile({
        currentFilePath: lessonPath,
        imagePathsToKeys,
        courseId: foundCourseId,
        lessonPathsToIds,
      }),
    ),
  );

  console.log('Course published');
}
