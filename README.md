# TigYog.app CLI (BETA!)

For context, see [TigYog.app](https://tigyog.app/) and [the TigYog docs](https://docs.tigyog.app/).
For an example course being written with the TigYog CLI, see [_Eigenwhat?_](https://github.com/tigyog/eigenwhat).

## Installation and usage

Requires Node.js 16.11 or newer.

```sh
$ npm install -g tigyog-cli
$ tigyog login y54wyu464432   # Content of TY_SESSION cookie from your browser
$ tigyog fmt my_course        # Put your course content in directory my_course
$ tigyog publish my_course    # Push course content to TigYog.app and publish it
```

## Planned features

If you need any of these, or have any other problems,
[email Jim](mailto:jameshfisher@gmail.com) or file a GitHub issue.

* All TigYog block types.
  Currently only supports Markdown blocks.

* Proper API keys for TigYog.
  Currently uses session tokens taken from the browser.
  These expire after around 6 months.

* Publishing with GitHub actions.
  We'll show an example of how to do this.
