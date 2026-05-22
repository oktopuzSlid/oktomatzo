const API = ''

document.addEventListener('DOMContentLoaded', function () {
  const tabLogin = document.getElementById('tab-login')
  const tabSignup = document.getElementById('tab-signup')
  const nameField = document.getElementById('name-field')
  const authForm = document.getElementById('auth-form')
  const submitBtn = authForm.querySelector('button[type="submit"]')
  const authMessage = document.getElementById('auth-message')
  const loggedIn = document.getElementById('logged-in')
  const displayName = document.getElementById('display-name')
  const logoutBtn = document.getElementById('logout-btn')
  const emailInput = document.getElementById('email')
  const passwordInput = document.getElementById('password')
  const nameInput = document.getElementById('name')

  let mode = 'login'

  function showTab(m) {
    mode = m
    tabLogin.style.background = m === 'login' ? 'rgba(59,130,246,0.1)' : 'transparent'
    tabLogin.style.color = m === 'login' ? 'var(--accent)' : 'var(--text-muted)'
    tabSignup.style.background = m === 'signup' ? 'rgba(59,130,246,0.1)' : 'transparent'
    tabSignup.style.color = m === 'signup' ? 'var(--accent)' : 'var(--text-muted)'
    nameField.style.display = m === 'signup' ? 'flex' : 'none'
    submitBtn.textContent = m === 'login' ? 'Log In' : 'Sign Up'
    authMessage.style.display = 'none'
  }

  tabLogin.addEventListener('click', function () { showTab('login') })
  tabSignup.addEventListener('click', function () { showTab('signup') })

  emailInput.addEventListener('input', function () { this.style.borderColor = ''; authMessage.style.display = 'none' })
  passwordInput.addEventListener('input', function () { this.style.borderColor = ''; authMessage.style.display = 'none' })
  if (nameInput) nameInput.addEventListener('input', function () { this.style.borderColor = '' })

  function showMessage(text, isError) {
    authMessage.textContent = text
    authMessage.style.display = 'block'
    authMessage.style.background = isError ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'
    authMessage.style.color = isError ? '#ef4444' : '#10b981'
    authMessage.style.border = '1px solid ' + (isError ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)')
  }

  async function checkSession() {
    const token = localStorage.getItem('token')
    const name = localStorage.getItem('user_name')
    if (token && name) {
      try {
        const res = await fetch(API + '/api/auth/me', {
          headers: { 'Authorization': 'Bearer ' + token }
        })
        if (res.ok) {
          authForm.style.display = 'none'
          loggedIn.style.display = 'block'
          displayName.textContent = name
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

    const email = emailInput.value
    const password = passwordInput.value
    const name = nameInput.value
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
    const body = mode === 'login'
      ? JSON.stringify({ email, password })
      : JSON.stringify({ name, email, password })

    try {
      const res = await fetch(API + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      })
      const data = await res.json()

      if (!res.ok) {
        var errMsg = 'Something went wrong'
        if (Array.isArray(data.detail)) {
          errMsg = data.detail.map(function (e) { return e.msg || e.message || JSON.stringify(e) }).join(', ')
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
        authForm.style.display = 'none'
        loggedIn.style.display = 'block'
        displayName.textContent = data.user_name
      }, 500)
    } catch (err) {
      showMessage('Network error — server may be waking up. Try again in a moment.', true)
    }

    submitBtn.disabled = false
    submitBtn.textContent = mode === 'login' ? 'Log In' : 'Sign Up'
  })

  logoutBtn.addEventListener('click', function () {
    localStorage.removeItem('token')
    localStorage.removeItem('user_name')
    loggedIn.style.display = 'none'
    authForm.style.display = 'flex'
    authMessage.style.display = 'none'
    emailInput.value = ''
    passwordInput.value = ''
    showTab('login')
  })

  checkSession()
})
