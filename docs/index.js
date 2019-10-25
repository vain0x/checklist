import { app, h } from "https://unpkg.com/hyperapp@2.0.3"

const TITLE = "Make Your Checklist [beta]"

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
  state.editing && !stateHasDraftEntry(state)
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

const stateDidChange = state => {
  state = stateEnsureDraftEntry(state)

  // FIXME: What is the correct hyperapp-way?
  storeState(state)

  return state
}

const editingDidChange = (state, ev) => {
  const editing = ev.target.checked
  state = editing
    ? ({ ...state, editing: true })
    : stateFinishEditing(state)
  return stateDidChange(state)
}

const entryRemoveButtonDidClick = index => state =>
  stateDidChange({
    ...state,
    entries: state.entries.filter((_, i) => i !== index),
  })

const entryUpButtonDidClick = index => state =>
  stateDidChange(stateSwapEntries(state, index - 1, index))

const entryDownButtonDidClick = index => state =>
  stateDidChange(stateSwapEntries(state, index, index + 1))

const entryTextDidInput = index => (state, ev) =>
  stateDidChange({
    ...state,
    entries: state.entries.map((entry, i) => (
      i !== index ? entry : ({
      ...entry,
      text: ev.target.value,
    }))),
  })

const entryCheckDidChange = index => (state, ev) =>
  stateDidChange({
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
// Persistent
// -----------------------------------------------

const HISTORY_STATE = null

const base64Encode = data => window.btoa(data)

const base64Decode = encodedString => window.atob(encodedString)

const serialize = state => base64Encode(JSON.stringify(state))

const deserialize = serializedState => {
  if (!serializedState) {
    return null
  }

  try {
    return JSON.parse(base64Decode(serializedState))
  } catch {
    return null
  }
}

const storeState = state => {
  const hash = "#" + serialize(state)
  window.history.replaceState(HISTORY_STATE, TITLE, hash)
}

const restoreState = () => {
  const hash = document.location.hash.replace(/^#/, "")
  const state = deserialize(hash)
  return state || stateEmpty
}

// -----------------------------------------------
// Infra
// -----------------------------------------------

const main = () => {
  const initialState = restoreState()

  app({
    init: initialState,
    view: renderApp,
    node: document.getElementById("app")
  })
}

document.addEventListener("DOMContentLoaded", main)
