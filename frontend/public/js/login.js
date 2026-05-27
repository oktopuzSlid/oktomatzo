const API = ''

document.addEventListener('DOMContentLoaded', function () {
  var tabLogin = document.getElementById('tab-login')
  var tabSignup = document.getElementById('tab-signup')
  var nameField = document.getElementById('name-field')
  var authForm = document.getElementById('auth-form')
  var submitBtn = authForm ? authForm.querySelector('button[type="submit"]') : null
  var authMessage = document.getElementById('auth-message')
  var loggedIn = document.getElementById('logged-in')
  var displayName = document.getElementById('display-name')
  var logoutBtn = document.getElementById('logout-btn')
  var emailInput = document.getElementById('email')
  var passwordInput = document.getElementById('password')
  var nameInput = document.getElementById('name')

  if (!authForm || !submitBtn) return

  var mode = 'login'

  function showTab(m) {
    mode = m
    if (tabLogin) { tabLogin.style.background = m === 'login' ? 'var(--accent-subtle)' : 'transparent'; tabLogin.style.color = m === 'login' ? 'var(--accent)' : 'var(--text-muted)' }
    if (tabSignup) { tabSignup.style.background = m === 'signup' ? 'var(--accent-subtle)' : 'transparent'; tabSignup.style.color = m === 'signup' ? 'var(--accent)' : 'var(--text-muted)' }
    if (nameField) nameField.style.display = m === 'signup' ? 'flex' : 'none'
    submitBtn.textContent = m === 'login' ? 'Log In' : 'Sign Up'
    if (authMessage) authMessage.style.display = 'none'
  }

  if (tabLogin) tabLogin.addEventListener('click', function () { showTab('login') })
  if (tabSignup) tabSignup.addEventListener('click', function () { showTab('signup') })

  function showMessage(text, isError) {
    if (!authMessage) return
    authMessage.textContent = ''
    authMessage.style.display = 'block'
    authMessage.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'
    authMessage.style.color = isError ? '#ef4444' : '#10b981'
    authMessage.style.border = '1px solid ' + (isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)')
    // Set text after styles
    authMessage.textContent = text
  }

  async function checkSession() {
    var token = localStorage.getItem('token')
    var name = localStorage.getItem('user_name')
    if (token && name && authForm && loggedIn) {
      try {
        var res = await fetch(API + '/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
        if (res.ok) {
          authForm.style.display = 'none'
          if (authMessage) authMessage.style.display = 'none'
          loggedIn.style.display = 'block'
          if (displayName) displayName.textContent = name
          return
        }
      } catch (e) {}
      localStorage.removeItem('token')
      localStorage.removeItem('user_name')
    }
  }

  authForm.addEventListener('submit', async function (e) {
    e.preventDefault()
    submitBtn.disabled = true
    submitBtn.textContent = 'Please wait...'

    var email = emailInput ? emailInput.value : ''
    var password = passwordInput ? passwordInput.value : ''
    var name = nameInput ? nameInput.value : ''
    var endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
    var body = mode === 'login'
      ? JSON.stringify({ email: email, password: password })
      : JSON.stringify({ name: name, email: email, password: password })

    try {
      var res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
      var data = await res.json()

      if (!res.ok) {
        var errMsg = 'Something went wrong'
        if (Array.isArray(data.detail)) {
          errMsg = data.detail.map(function (e) { return e.msg || e.message || '' }).filter(Boolean).join(', ') || 'Validation failed'
        } else if (typeof data.detail === 'string') {
          errMsg = data.detail
        } else if (data.message) {
          errMsg = data.message
        }
        showMessage(errMsg, true)
        submitBtn.disabled = false
        submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up'
        return
      }

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user_name', data.user_name)

      showMessage(mode === 'login' ? 'Logged in successfully!' : 'Account created!', false)
      setTimeout(function () {
        if (authForm) authForm.style.display = 'none'
        if (authMessage) authMessage.style.display = 'none'
        if (loggedIn) { loggedIn.style.display = 'block'; if (displayName) displayName.textContent = data.user_name }
      }, 500)
    } catch (err) {
      showMessage('Network error — server may be waking up. Try again in a moment.', true)
    }

    submitBtn.disabled = false
    submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up'
  })

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      localStorage.removeItem('token')
      localStorage.removeItem('user_name')
      if (loggedIn) loggedIn.style.display = 'none'
      if (authForm) authForm.style.display = 'flex'
      if (nameInput) nameInput.value = ''
      if (emailInput) emailInput.value = ''
      if (passwordInput) passwordInput.value = ''
      showTab('login')
    })
  }

  checkSession()
})
