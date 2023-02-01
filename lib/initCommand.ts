import * as fs from 'fs/promises';

const indexMdContent = `---
type: course
---

# The Flat Out Truth!

## An interactive intro to Flat Earth theory

Tired of being fed lies and misinformation by the Round Earth Society?
By the end of this course,
you will be able to argue the truth
and leave the Round Earth Society speechless.
So grab your tin foil hat
and join me to uncover the truth!

::buy[I want it! I can handle the truth!]

## What's in the course?

:::chapterlink{path=horizon.md}
# 1. The Evidence of the Horizon

In this chapter, you'll learn how the flat and level horizon is proof positive of a flat Earth,
and why it's time to break free from the Round Earth Society's lies.
:::

:::chapterlink
# The Lack of Gravity

We'll discuss how the Round Earth Society's concept of gravity is a hoax,
and how a flat Earth easily explains why we stay on the surface and don't fall off.
:::

:::chapterlink
# The Conspiracy of Space Travel

Learn about the mysterious dome that surrounds the flat Earth and keeps us safe from outer space.
Discover the truth about the moon landing and other supposed space missions,
and how they were all staged to cover up the truth about the flat Earth.
:::
`;

const horizonMdContent = `
# The Evidence of the Horizon

Welcome to the first chapter of _The Flat Out Truth_!
In this chapter, we'll discuss the most obvious and convincing evidence that our planet is flat: the horizon.

Imagine yourself standing on the beach, looking out to the sea.
What best describes the horizon?
:buttons

* Curves down to each side :b{.incorrect}

  Nonsense! It's flat, as far as the eye can see.

  * Okay :b

* Always flat and level :b{.correct}

* Curves up at each side :b{.incorrect}

  Nonsense! It's flat, as far as the eye can see.

  * Okay :b

You see, if the Earth were round, the horizon would curve, but it never does.
This is irrefutable evidence that the Earth is flat.

In the next chapter, we'll learn about the Gravity Hoax.
(Spoiler: there's no such thing!)
`;

export const writeFile = async (
  filePath: string,
  fileContent: string,
): Promise<void> => {
  const h = await fs.open(filePath, 'wx');
  await h.write(fileContent);
};

export const initCommand = async (): Promise<void> => {
  await writeFile('index.md', indexMdContent);
  await writeFile('horizon.md', horizonMdContent);
};
