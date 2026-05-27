// Oktomatzo Host — Platform SDK
// Projects can use window.Platform to interact with the platform:
// auth, saves, scores, and model uploads.
// All methods gracefully no-op if the user is not logged in.

(function () {
  'use strict'

  function getToken() { return localStorage.getItem('token') }
  function getUserName() { return localStorage.getItem('user_name') }
  function isLoggedIn() { return !!getToken() }

  var API = ''

  async function authFetch(path, options) {
    var token = getToken()
    var headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = 'Bearer ' + token
    if (options && options.headers) Object.assign(headers, options.headers)
    var res = await fetch(API + path, { ...options, headers: headers })
    if (!res.ok) {
      var msg = 'Request failed'
      try { var d = await res.json(); msg = d.detail || msg } catch (e) {}
      throw new Error(msg)
    }
    return res.json()
  }

  window.Platform = {

    // ── Auth ──────────────────────────────────────────
    auth: {
      isLoggedIn: isLoggedIn,
      getUserName: getUserName,
      getToken: getToken,

      signup: function (name, email, password) {
        return authFetch('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ name: name, email: email, password: password }),
        }).then(function (data) {
          localStorage.setItem('token', data.access_token)
          localStorage.setItem('user_name', data.user_name)
          return data
        })
      },

      login: function (email, password) {
        return authFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: email, password: password }),
        }).then(function (data) {
          localStorage.setItem('token', data.access_token)
          localStorage.setItem('user_name', data.user_name)
          return data
        })
      },

      logout: function () {
        localStorage.removeItem('token')
        localStorage.removeItem('user_name')
      },
    },

    // ── Saves ─────────────────────────────────────────
    saves: {
      save: function (projectSlug, label, state) {
        return authFetch('/api/saves', {
          method: 'POST',
          body: JSON.stringify({ project_slug: projectSlug, label: label, state: state }),
        })
      },

      load: function (slug) {
        return authFetch('/api/saves/' + slug)
      },

      deleteSave: function (id) {
        return authFetch('/api/saves/' + id, { method: 'DELETE' })
      },
    },

    // ── Scores ────────────────────────────────────────
    scores: {
      submit: function (projectSlug, score, metadata) {
        return authFetch('/api/scores', {
          method: 'POST',
          body: JSON.stringify({ project_slug: projectSlug, score: score, metadata: metadata || {} }),
        })
      },

      leaderboard: function (slug) {
        return authFetch('/api/scores/' + slug + '?limit=20')
      },
    },

    // ── Models ────────────────────────────────────────
    models: {
      upload: function (projectSlug, file) {
        var token = getToken()
        var form = new FormData()
        form.append('project_slug', projectSlug)
        form.append('file', file)
        var headers = token ? { 'Authorization': 'Bearer ' + token } : {}
        return fetch(API + '/api/models/upload', {
          method: 'POST',
          headers: headers,
          body: form,
        }).then(function (res) {
          if (!res.ok) { return res.json().then(function (d) { throw new Error(d.detail || 'Upload failed') }) }
          return res.json()
        })
      },

      list: function () {
        return authFetch('/api/models')
      },

      deleteModel: function (id) {
        return authFetch('/api/models/' + id, { method: 'DELETE' })
      },
    },
  }
})()
