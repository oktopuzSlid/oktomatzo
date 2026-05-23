document.addEventListener('DOMContentLoaded', function () {
  var root = document.getElementById('project-root')
  if (!root) return

  var heading = document.createElement('h2')
  heading.textContent = 'Persistent Counter'
  heading.style.fontSize = '1.5rem'
  heading.style.fontWeight = '700'
  heading.style.color = 'var(--accent)'

  var counter = document.createElement('div')
  counter.style.fontSize = '4rem'
  counter.style.fontWeight = '700'
  counter.style.marginTop = '16px'
  counter.style.color = 'var(--text)'
  counter.textContent = '—'

  var desc = document.createElement('p')
  desc.textContent = 'Click the buttons below. Your count is saved to the server.'
  desc.style.color = 'var(--text-muted)'
  desc.style.fontSize = '0.9rem'
  desc.style.marginTop = '8px'

  var btnRow = document.createElement('div')
  btnRow.style.display = 'flex'
  btnRow.style.gap = '8px'
  btnRow.style.marginTop = '20px'

  var incrementBtn = document.createElement('button')
  incrementBtn.className = 'btn btn-primary'
  incrementBtn.textContent = '+1'

  var saveBtn = document.createElement('button')
  saveBtn.className = 'btn btn-outline'
  saveBtn.textContent = 'Save Count'

  var statusMsg = document.createElement('p')
  statusMsg.style.color = 'var(--text-muted)'
  statusMsg.style.fontSize = '0.8rem'
  statusMsg.style.marginTop = '12px'

  btnRow.appendChild(incrementBtn)
  btnRow.appendChild(saveBtn)

  root.appendChild(heading)
  root.appendChild(counter)
  root.appendChild(desc)
  root.appendChild(btnRow)
  root.appendChild(statusMsg)

  var count = 0
  var SAVE_LABEL = 'counter'

  function updateDisplay() {
    counter.textContent = count
  }

  async function loadCount() {
    try {
      var token = localStorage.getItem('token')
      if (!token) { statusMsg.textContent = 'Log in to save your count across sessions.'; return }
      var res = await fetch('/api/saves/hello-world', { headers: { 'Authorization': 'Bearer ' + token } })
      var saves = await res.json()
      if (Array.isArray(saves)) {
        var found = saves.find(function (s) { return s.label === SAVE_LABEL })
        if (found && found.state && typeof found.state.count === 'number') {
          count = found.state.count
          updateDisplay()
          statusMsg.textContent = 'Count restored from server.'
        }
      }
    } catch (e) { statusMsg.textContent = 'Could not load saved count.' }
  }

  async function saveCount() {
    try {
      var token = localStorage.getItem('token')
      if (!token) { statusMsg.textContent = 'Log in first to save.'; return }
      await fetch('/api/saves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ project_slug: 'hello-world', label: SAVE_LABEL, state: { count: count } })
      })
      statusMsg.textContent = 'Saved! Count = ' + count
    } catch (e) { statusMsg.textContent = 'Save failed.' }
  }

  incrementBtn.addEventListener('click', function () { count++; updateDisplay(); statusMsg.textContent = '' })
  saveBtn.addEventListener('click', saveCount)

  loadCount()
})
