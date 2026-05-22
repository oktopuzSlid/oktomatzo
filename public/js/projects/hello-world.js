// ============================================================
// hello-world.js — LOGIC for the HELLO WORLD project
// ============================================================
// Each project gets its own JS file.
// Finds the #project-root div and fills it with interactive content.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  const root = document.getElementById('project-root')

  if (!root) return

  // Clear placeholder
  root.innerHTML = ''

  // Create a heading
  const heading = document.createElement('h2')
  heading.textContent = 'Hello, World!'
  heading.style.color = 'var(--text-accent, #8b5cf6)'
  heading.style.fontSize = '1.5rem'
  heading.style.fontWeight = '700'

  // Create a description paragraph
  const paragraph = document.createElement('p')
  paragraph.textContent = 'Your project system is working. Add your own content here.'
  paragraph.style.marginTop = '16px'
  paragraph.style.color = 'var(--text-secondary, #a1a1aa)'

  // Create a counter button to show JS interaction
  const button = document.createElement('button')
  button.textContent = 'Clicked 0 times'
  button.className = 'btn btn-outline'
  button.style.marginTop = '24px'

  let count = 0
  button.addEventListener('click', function () {
    count++
    button.textContent = 'Clicked ' + count + ' times'
  })

  // Append everything to the root container
  root.appendChild(heading)
  root.appendChild(paragraph)
  root.appendChild(button)
})
