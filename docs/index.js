import { app, h } from "https://unpkg.com/hyperapp@2.0.3"

const stringIsBlank = s =>
  s.trim() === ""

const arrayLast = array =>
  array.length !== 0 ? array[array.length - 1] : undefined

// -----------------------------------------------
// Model
// -----------------------------------------------

const entryEmpty = {
  text: "",
  checked: false,
}

const stateEmpty = {
  editing: true,
  draftText: "",
  entries: [],
}

const stateFinishEditing = state =>
  !state.editing ? state : {
    editing: false,
    entries:
      state.entries
        .filter(({ text }) => !stringIsBlank(text))
        .map(entry => ({
          ...entry,
          text: entry.text.trim(),
        }))
  }

const stateHasDraftEntry = state => {
  const last = arrayLast(state.entries)
  return last && stringIsBlank(last.text)
}

const stateEnsureDraftEntry = state =>
  !stateHasDraftEntry(state)
    ? ({ ...state, entries: [...state.entries, entryEmpty] })
    : state

const stateSwapEntries = (state, first, second) => {
  if (first < 0 || second >= state.entries.length) {
    return state
  }

  return {
    ...state,
    entries: state.entries.map((entry, i) =>
      i === first ? state.entries[second] :
      i === second ? state.entries[first] :
        entry,
    )
  }
}

// -----------------------------------------------
// Update
// -----------------------------------------------

const editingDidChange = (state, ev) => {
  const editing = ev.target.checked
  return editing
    ? stateEnsureDraftEntry({ ...state, editing: true })
    : stateFinishEditing(state)
}

const entriesDidChange = state =>
  stateEnsureDraftEntry(state)

const entryRemoveButtonDidClick = index => state =>
  entriesDidChange({
    ...state,
    entries: state.entries.filter((_, i) => i !== index),
  })

const entryUpButtonDidClick = index => state =>
  entriesDidChange(stateSwapEntries(state, index - 1, index))

const entryDownButtonDidClick = index => state =>
  entriesDidChange(stateSwapEntries(state, index, index + 1))

const entryTextDidInput = index => (state, ev) =>
  entriesDidChange({
    ...state,
    entries: state.entries.map((entry, i) => (
      i !== index ? entry : ({
      ...entry,
      text: ev.target.value,
    }))),
  })

const entryCheckDidChange = index => (state, ev) =>
  ({
    ...state,
    entries: state.entries.map((entry, i) => (
      i !== index ? entry : ({
      ...entry,
      checked: ev.target.checked,
    }))),
  })

// -----------------------------------------------
// View
// -----------------------------------------------

const renderEdit = state => (
  h("article", {
    class: "editor",
  }, [
    h("ul", {}, (
      state.entries.map(({ text }, i) => (
        h("li", {}, [
          h("button", {
            class: "up-button default-button",
            onClick: entryUpButtonDidClick(i),
          }, "▲"),
          h("button", {
            class: "down-button default-button",
            onClick: entryDownButtonDidClick(i),
          }, "▼"),

          h("input", {
            type: "text",
            class: "entry-text-input",
            onInput: entryTextDidInput(i),
            value: text,
          }),

          h("button", {
            type: "button",
            class: "remove-button danger-button",
            onClick: entryRemoveButtonDidClick(i),
          }, "✖"),
        ])))
    )),
  ])
)

const renderChecklist = state => (
  h("article", {
    class: "checklist",
  }, [
    h("ul", {}, (
      state.entries.map(({ text, checked }, i) => (
        h("li", {}, (
          h("label", {}, [
            h("input", {
              type: "checkbox",
              checked,
              onChange: entryCheckDidChange(i),
            }),
            text,
          ])
        ))))
    )),
  ])
)

const renderApp = state => (
  h("main", { id: "app" }, [
    !state.editing ? renderChecklist(state) : null,

    state.editing ? renderEdit(state) : null,

    h("label", { class: "editor-toggle-label" }, [
      h("input", {
        type: "checkbox",
        class: "editor-toggle-checkbox",
        onChange: editingDidChange,
        checked: state.editing,
      }),
      state.editing ? "✔ OK" : "🖊 Edit",
    ]),
  ])
)

// -----------------------------------------------
// Infra
// -----------------------------------------------

const main = () => {
  app({
    init: stateEmpty,
    view: renderApp,
    node: document.getElementById("app")
  })
}

document.addEventListener("DOMContentLoaded", main)
