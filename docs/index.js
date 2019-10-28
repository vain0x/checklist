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
  editing: false,
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

const stateAddEntry = (state, text) =>
  ({ ...state, entries: [...state.entries, { ...entryEmpty, text }] })

const stateCheckEntry = (state, index, checked) =>
  ({
    ...state,
    entries: state.entries.map((entry, i) => (
      i !== index ? entry : ({
        ...entry,
        checked,
      }))),
  })

const stateHasDraftEntry = state => {
  const last = arrayLast(state.entries)
  return last && stringIsBlank(last.text)
}

const stateEnsureDraftEntry = state =>
  state.editing && !stateHasDraftEntry(state)
    ? stateAddEntry(state, "")
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

const stateFromEventList = events => {
  let state = ({ ...stateEmpty, editing: true })

  for (const event of events) {
    const type = event[0]

    switch (type) {
      case "END_EDIT": {
        state = stateFinishEditing(state)
        continue
      }
      case "ADD_ENTRY": {
        const [, text] = event
        if (typeof text !== "string") {
          continue
        }
        state = stateAddEntry(state, text)
        continue
      }
      case "CHECK_ENTRY": {
        const [, index] = event
        if (!Number.isSafeInteger(index)) {
          continue
        }
        state = stateCheckEntry(state, index, true)
        continue
      }
      default:
        console.error("WARN: Unknown event", event)
        continue
    }
  }

  return stateEnsureDraftEntry(state)
}

// Convert the state to a list of events that can rebuild the state later.
// For compatibility, the event list is serialized rather than the state.
const stateToEventList = state => {
  const events = []

  for (let i = 0; i < state.entries.length; i++) {
    const { text, checked } = state.entries[i]

    events.push(["ADD_ENTRY", String(text)])

    if (checked) {
      events.push(["CHECK_ENTRY", i])
    }
  }

  if (!state.editing) {
    events.push(["END_EDIT"])
  }

  return events
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

const editButtonDidClick = state => {
  const editing = !state.editing
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
  stateDidChange(stateCheckEntry(state, index, ev.target.checked))

// -----------------------------------------------
// View
// -----------------------------------------------

const renderApp = state => (
  h("main", { id: "app" }, [
    h("article", {
      class: "checklist",
      "data-editing": String(state.editing),
    }, [
      h("ul", {}, (
        state.entries.map(({ text, checked }, i) => (
          h("li", {
            class: "entry",
            "data-checked": String(checked),
          }, [
            h("label", { class: "entry-text-label" }, [
              h("input", {
                type: "checkbox",
                hidden: true,
                checked,
                onChange: entryCheckDidChange(i),
              }),

              h("div", { class: "entry-checkmark" }, "✔"),

              !state.editing ? (
                h("div", { class: "entry-text" }, text)
              ) : null,
            ]),

            state.editing ? [
              h("input", {
                type: "text",
                class: "entry-text-input",
                size: 10,
                onInput: entryTextDidInput(i),
                value: text,
              }),

              h("button", {
                class: "up-button default-button",
                onClick: entryUpButtonDidClick(i),
              }, "▲"),

              h("button", {
                class: "down-button default-button",
                onClick: entryDownButtonDidClick(i),
              }, "▼"),

              h("button", {
                type: "button",
                class: "remove-button danger-button",
                onClick: entryRemoveButtonDidClick(i),
              }, "✖"),
            ] : null,
          ])))
      )),
    ]),

    h("button", {
      type: "button",
      class: "edit-button",
      onClick: editButtonDidClick,
    }, state.editing ? "✔ OK" : "🖊 Edit"),
  ])
)

// -----------------------------------------------
// Persistent
// -----------------------------------------------

const HISTORY_STATE = null

const TEXT_ENCODER = new TextEncoder()

const TEXT_DECODER = new TextDecoder()

const serialize = state =>
  window.base64js.fromByteArray(
    window.pako.deflateRaw(
      TEXT_ENCODER.encode(
        JSON.stringify(
          stateToEventList(
            state
          )))))

const deserialize = serial => {
  if (!serial) {
    return null
  }

  try {
    const state = (
      stateFromEventList(
        JSON.parse(
          TEXT_DECODER.decode(
            window.pako.inflateRaw(
              window.base64js.toByteArray(
                serial
              ))))))
    return state
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
