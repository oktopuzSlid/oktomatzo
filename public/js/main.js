// main.js — Site-wide features + backend health indicator

document.addEventListener('DOMContentLoaded', function () {
  var footer = document.querySelector('.site-footer .container')
  if (!footer) return

  var statusDot = document.createElement('span')
  statusDot.style.display = 'inline-block'
  statusDot.style.width = '8px'
  statusDot.style.height = '8px'
  statusDot.style.borderRadius = '50%'
  statusDot.style.marginLeft = '8px'
  statusDot.style.verticalAlign = 'middle'
  statusDot.style.backgroundColor = '#6b7280'
  statusDot.title = 'Checking backend...'

  var statusText = document.createElement('span')
  statusText.style.marginLeft = '4px'
  statusText.style.fontSize = '0.75rem'
  statusText.style.color = '#6b7280'
  statusText.textContent = 'backend...'

  var wrapper = document.createElement('span')
  wrapper.style.display = 'inline-block'
  wrapper.appendChild(statusDot)
  wrapper.appendChild(statusText)

  var p = footer.querySelector('p')
  if (p) {
    p.appendChild(wrapper)
  }

  fetch('/api/health')
    .then(function (r) { return r.json() })
    .then(function (data) {
      statusDot.style.backgroundColor = '#10b981'
      statusText.textContent = 'backend live'
    })
    .catch(function () {
      statusDot.style.backgroundColor = '#ef4444'
      statusText.textContent = 'backend off'
    })
})
