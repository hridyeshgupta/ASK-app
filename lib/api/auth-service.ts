// lib/api/auth-service.ts
// Empty shells for auth operations

export const authService = {

  // Login with email + password
  async login(email: string, password: string) {
    // TODO: Firebase Auth signInWithEmailAndPassword
  },

  // Login with Google SSO
  async loginWithGoogle() {
    // TODO: Firebase Auth signInWithPopup (GoogleAuthProvider)
  },

  // Get current user profile
  async getUser() {
    // TODO: Fetch user profile from backend
  },

  // Invite a new user (admin only)
  async inviteUser(email: string, role: string, module: string) {
    // TODO: POST /admin/invite
  },

  // Logout
  async logout() {
    // TODO: Firebase Auth signOut
  },
};
