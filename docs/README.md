# Documentation screenshots

The root [README](../README.md) uses PNG screenshots of the running application. They show real controls, layouts, generated scorecards, and completed flows. Questions, draft quizzes, collections, bookmarks, and historical scores are illustrative data; they are not activity or user-count claims.

Open [gallery.html](gallery.html) in a web browser to view all 16 screenshots without a Markdown preview. Each thumbnail opens its full-size image.

## Capture the current UI

1. Install the app's dependencies with `npm ci` and start it with `npm start`.
2. Make sure Google Chrome is installed. The capture script uses Playwright's `chrome` channel by default.
3. Make Playwright available outside the project's dependency tree, then run the capture script from the repository root:

```bash
capture_tools="$(mktemp -d "${TMPDIR:-/tmp}/quizapp-capture.XXXXXX")"
npm install --prefix "$capture_tools" --no-package-lock --no-save playwright
PLAYWRIGHT_MODULE="$capture_tools/node_modules/playwright" node docs/scripts/capture-screenshots.cjs
```

If Playwright is already available, set `PLAYWRIGHT_MODULE` to that installation instead. When it is resolvable from the project, `node docs/scripts/capture-screenshots.cjs` is sufficient. This optional tool is not an application dependency.

Supported environment variables:

| Variable                 | Default                    | Purpose                                                               |
| ------------------------ | -------------------------- | --------------------------------------------------------------------- |
| `PLAYWRIGHT_MODULE`      | `playwright`               | Node-resolvable name or path for an existing Playwright installation. |
| `QUIZ_SCREENSHOT_URL`    | `http://localhost:3000`    | Address of the locally running app, including its port.               |
| `CHROME_EXECUTABLE_PATH` | Chrome's installed channel | Optional path to a compatible Chrome/Chromium executable.             |

The script:

- Uses fresh browser contexts, without reading your normal browser profile or its saved data.
- Supplies sample questions through a browser-level interception of trivia requests.
- Exercises exam answers, navigation, score naming, review, scorecard sharing, and a complete friend challenge.
- Opens practice mode, the custom quiz editor, invitations, collections, bookmarks, history, and progress.
- Seeds a clearly illustrative local history for the progress screenshot.
- Captures desktop views at 1280 pixels wide and a dark mobile view at 390 pixels wide.
- Checks for application JavaScript errors before completing.
- Writes only screenshots to `docs/images/`; it does not publish the site or change application source.

## Image index

| Image                                                           | What it documents                                                    |
| --------------------------------------------------------------- | -------------------------------------------------------------------- |
| [quiz-setup.png](images/quiz-setup.png)                         | Quiz configuration, modes, subjects, timing, and presets.            |
| [question-navigator.png](images/question-navigator.png)         | Active exam, question states, bookmarks, and movement controls.      |
| [practice-mode.png](images/practice-mode.png)                   | Immediate feedback and locked answer choices.                        |
| [score-and-results.png](images/score-and-results.png)           | Named round, score, breakdown, metrics, and result actions.          |
| [answer-review.png](images/answer-review.png)                   | Filtered answer review and saved-question action.                    |
| [saved-questions.png](images/saved-questions.png)               | Searchable bookmark library and practice selection.                  |
| [quiz-builder.png](images/quiz-builder.png)                     | Editable question, correct-answer selection, and ordering controls.  |
| [quiz-settings.png](images/quiz-settings.png)                   | Title, author, introduction, collection, mode, attempts, and timing. |
| [custom-quiz-invitation.png](images/custom-quiz-invitation.png) | Shared custom quiz and remaining attempt allowance.                  |
| [quiz-collections.png](images/quiz-collections.png)             | Collections, member quizzes, and organisation controls.              |
| [friend-challenge.png](images/friend-challenge.png)             | Friend challenge invitation and host score.                          |
| [challenge-comparison.png](images/challenge-comparison.png)     | Completed challenge with both participants' results.                 |
| [share-score.png](images/share-score.png)                       | Generated PNG preview, download, and text-copy controls.             |
| [recent-rounds.png](images/recent-rounds.png)                   | Sample history with test names and personal-best markers.            |
| [progress-over-time.png](images/progress-over-time.png)         | Accuracy trend, comparison group, and summary metrics.               |
| [mobile-dark.png](images/mobile-dark.png)                       | Mobile layout and dark-theme practice feedback.                      |

## Keep the README accurate

After a UI change, rerun the capture script, inspect the images, and update the root README's descriptions and alt text if needed. Keep image links relative so they work on GitHub and in local Markdown previews. Add a feature to the implemented feature list only after it exists in the application.
