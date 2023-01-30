# TigYog.app CLI (BETA!)

For context, see [TigYog.app](https://tigyog.app/) and [the TigYog docs](https://docs.tigyog.app/).
For an example course being written with the TigYog CLI, see [_Eigenwhat?_](https://github.com/tigyog/eigenwhat).

## Installation and usage

Requires Node.js 16.11 or newer.

```shell-session
$ npm install -g tigyog-cli
$ tigyog login my_session_token   # Get this from https://tigyog.app/account
$ tigyog fmt my_course            # Put your course content in directory my_course
$ tigyog publish my_course        # Push course content to TigYog.app and publish it
```

## Planned features

If you need any of these, or have any other problems,
[email Jim](mailto:jameshfisher@gmail.com) or file a GitHub issue.

* All TigYog block types.
  Currently only supports Markdown blocks.

* API keys.
  Currently authenticates using session tokens taken from the browser.
  These expire after around 6 months.

* Publishing with GitHub actions.
  We'll show an example of how to do this.
