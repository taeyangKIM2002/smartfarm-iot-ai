export interface AuthUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  accessTokenExpiresIn: number;
  user?: Omit<AuthUser, 'password'>;
  message?: string;
}

export interface SignupInput {
  email: string;
  password: string;
  name: string;
}

const USERS_KEY = 'smartfarm_users';
const TOKEN_KEY = 'accessToken';
const CURRENT_USER_KEY = 'currentUser';

const DEFAULT_ADMIN: AuthUser = {
  email: 'demo@gmail.com',
  password: '1234',
  name: '관리자',
  role: 'admin',
};

const withoutPassword = (user: AuthUser): Omit<AuthUser, 'password'> => ({
  email: user.email,
  name: user.name,
  role: user.role,
});

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const readUsers = (): AuthUser[] => {
  const rawUsers = localStorage.getItem(USERS_KEY);
  let users: AuthUser[] = [];

  if (rawUsers) {
    try {
      users = JSON.parse(rawUsers);
    } catch {
      users = [];
    }
  }

  const hasAdmin = users.some((user) => normalizeEmail(user.email) === DEFAULT_ADMIN.email);
  if (!hasAdmin) {
    users = [DEFAULT_ADMIN, ...users];
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  return users;
};

const writeUsers = (users: AuthUser[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const createSession = (user: AuthUser): LoginResponse => {
  const response = {
    success: true,
    accessToken: `local-token-${Date.now()}`,
    accessTokenExpiresIn: 3600000,
    user: withoutPassword(user),
  };

  localStorage.setItem(TOKEN_KEY, response.accessToken);
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
  return response;
};

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const normalizedEmail = normalizeEmail(email);
    const users = readUsers();
    const user = users.find(
      (candidate) => normalizeEmail(candidate.email) === normalizedEmail && candidate.password === password
    );

    if (!user) {
      return {
        success: false,
        accessToken: '',
        accessTokenExpiresIn: 0,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      };
    }

    return createSession(user);
  },

  signup: async ({ email, password, name }: SignupInput): Promise<LoginResponse> => {
    const normalizedEmail = normalizeEmail(email);
    const users = readUsers();
    const alreadyExists = users.some((user) => normalizeEmail(user.email) === normalizedEmail);

    if (alreadyExists) {
      return {
        success: false,
        accessToken: '',
        accessTokenExpiresIn: 0,
        message: '이미 가입된 이메일입니다.',
      };
    }

    const newUser: AuthUser = {
      email: normalizedEmail,
      password,
      name: name.trim() || normalizedEmail.split('@')[0],
      role: 'user',
    };

    writeUsers([...users, newUser]);
    return createSession(newUser);
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  isLoggedIn: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  },

  getCurrentUser: (): Omit<AuthUser, 'password'> | null => {
    const rawUser = localStorage.getItem(CURRENT_USER_KEY);
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  },
};
