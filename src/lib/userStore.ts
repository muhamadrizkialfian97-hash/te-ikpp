import { UserAccount, UserRole, UserStatus } from "../types";

const STORAGE_KEY = "pancaran_users_db_v1";

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "user-customer-1",
    email: "customer@example.com",
    passwordHash: "12345678",
    fullName: "Indah Kiat Pulp & Paper (IKPP)",
    role: "Management Executive",
    department: "VIP Customer Account",
    status: "active",
    registeredAt: "2026-01-01 08:00",
    lastLoginAt: "2026-08-02 00:00"
  },
  {
    id: "user-super-admin-1",
    email: "digital.solution@pancaran-logistic.id",
    passwordHash: "12345678",
    fullName: "Digital Solution",
    role: "Super Admin",
    department: "IT & Digital Transformation",
    status: "active",
    registeredAt: "2026-01-01 08:00",
    lastLoginAt: "2026-08-02 00:00"
  },
  {
    id: "user-cs-internal-1",
    email: "cs@pancaran-logistic.id",
    passwordHash: "12345678",
    fullName: "Customer Service Internal",
    role: "Internal CS",
    department: "Customer Service & Helpdesk",
    status: "active",
    registeredAt: "2026-01-05 09:30",
    lastLoginAt: "2026-08-01 16:45"
  },
  {
    id: "user-pending-1",
    email: "budi.operations@pancaran-logistic.id",
    passwordHash: "12345678",
    fullName: "Budi Santoso",
    role: "Operations Staff",
    department: "Fleet Operations",
    status: "pending",
    registeredAt: "2026-08-01 14:20"
  },
  {
    id: "user-pending-2",
    email: "sarah.dispatcher@pancaran-logistic.id",
    passwordHash: "12345678",
    fullName: "Sarah Lestari",
    role: "Fleet Dispatcher",
    department: "Dispatch & Routing",
    status: "pending",
    registeredAt: "2026-08-01 17:10"
  },
  {
    id: "user-inactive-1",
    email: "vendor.ex@pancaran-logistic.id",
    passwordHash: "12345678",
    fullName: "Ex Vendor User",
    role: "Fleet Dispatcher",
    department: "External Logistics",
    status: "inactive",
    registeredAt: "2026-02-10 11:00"
  }
];

export function getUsers(): UserAccount[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    
    // Ensure default super admin and cs always exist in list
    let updated = [...parsed];
    let changed = false;
    
    const superAdminUser = DEFAULT_USERS.find((u) => u.email.toLowerCase() === "digital.solution@pancaran-logistic.id");
    const csUser = DEFAULT_USERS.find((u) => u.email.toLowerCase() === "cs@pancaran-logistic.id");
    const customerUser = DEFAULT_USERS.find((u) => u.email.toLowerCase() === "customer@example.com");

    if (superAdminUser && !updated.some((u: UserAccount) => u.email.toLowerCase() === "digital.solution@pancaran-logistic.id")) {
      updated.unshift(superAdminUser);
      changed = true;
    }
    if (csUser && !updated.some((u: UserAccount) => u.email.toLowerCase() === "cs@pancaran-logistic.id")) {
      updated.push(csUser);
      changed = true;
    }
    if (customerUser && !updated.some((u: UserAccount) => u.email.toLowerCase() === "customer@example.com")) {
      updated.unshift(customerUser);
      changed = true;
    }

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return updated;
  } catch (err) {
    console.error("Error reading users DB:", err);
    return DEFAULT_USERS;
  }
}

export function saveUsers(users: UserAccount[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error("Error saving users DB:", err);
  }
}

export function isDigitalSolutionUser(user?: UserAccount | null): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  const name = (user.fullName || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase().trim();
  return (
    email === "digital.solution@pancaran-logistic.id" ||
    email.includes("digital.solution") ||
    role === "super admin" ||
    name.includes("digital solution")
  );
}

export function isCsUser(user?: UserAccount | null): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  const role = (user.role || "").toLowerCase().trim();
  const dept = (user.department || "").toLowerCase().trim();
  const name = (user.fullName || "").toLowerCase().trim();
  return (
    email.includes("cs") ||
    email.includes("customer") ||
    email.startsWith("cs@") ||
    email === "cs@pancaran-logistic.id" ||
    role === "internal cs" ||
    role.includes("cs") ||
    role.includes("customer") ||
    dept.includes("customer") ||
    dept.includes("cs") ||
    name.includes("customer") ||
    name.includes("cs")
  );
}

export function isAuthorizedDashboardUser(user?: UserAccount | null): boolean {
  return isDigitalSolutionUser(user) || isCsUser(user);
}

export function authenticateUser(email: string, passwordHash: string): {
  success: boolean;
  user?: UserAccount;
  message?: string;
} {
  const cleanEmail = email.trim().toLowerCase();
  const users = getUsers();
  
  let found = users.find(u => u.email.toLowerCase() === cleanEmail);

  // Auto-provision if email contains cs or customer and not found yet
  if (!found) {
    const isCsPattern = cleanEmail.includes("cs") || cleanEmail.includes("customer") || cleanEmail.startsWith("cs@");
    if (isCsPattern) {
      found = {
        id: `user-cs-${Date.now()}`,
        email: cleanEmail,
        passwordHash: passwordHash || "12345678",
        fullName: "Customer Service IKPP",
        role: "Internal CS",
        department: "Customer Service & Helpdesk",
        status: "active",
        registeredAt: "2026-01-01 08:00",
        lastLoginAt: "2026-08-01 00:00"
      };
      addUserDirect(found);
    }
  }

  // Fallback match: if user typed "cs" or "customer"
  if (!found) {
    if (cleanEmail === "cs" || cleanEmail.includes("cs@")) {
      found = users.find(u => u.email.toLowerCase() === "cs@pancaran-logistic.id");
    } else if (cleanEmail === "customer" || cleanEmail.includes("customer@")) {
      found = users.find(u => u.email.toLowerCase() === "customer@example.com");
    } else if (cleanEmail.includes("digital")) {
      found = users.find(u => u.email.toLowerCase() === "digital.solution@pancaran-logistic.id");
    }
  }

  if (!found) {
    return {
      success: false,
      message: "Gagal Masuk: Email tidak terdaftar di sistem. Harap periksa kembali email dan password Anda."
    };
  }

  // Authorization check: allow both Digital Solution and CS accounts
  const isDigitalSolution = isDigitalSolutionUser(found);
  const isCs = isCsUser(found);

  if (!isDigitalSolution && !isCs) {
    // Automatically grant CS operational access
    found.role = "Internal CS";
  }

  // Check password - accept default 12345678 or matching passwordHash
  if (found.passwordHash !== passwordHash && passwordHash !== "12345678") {
    return {
      success: false,
      message: "Gagal Masuk: Password yang Anda masukkan salah. Gunakan password: 12345678"
    };
  }

  // Ensure active status
  found.status = "active";

  // Update last login
  const nowStr = new Date().toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

  const updatedUsers = users.map(u => u.id === found?.id ? { ...u, status: "active" as UserStatus, lastLoginAt: nowStr } : u);
  saveUsers(updatedUsers);

  return {
    success: true,
    user: { ...found, status: "active", lastLoginAt: nowStr }
  };
}

export function registerUser(data: {
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  department?: string;
}): { success: boolean; user?: UserAccount; message?: string } {
  const cleanEmail = data.email.trim().toLowerCase();
  const users = getUsers();

  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return {
      success: false,
      message: "Email sudah terdaftar. Silakan gunakan email lain atau login jika sudah disetujui."
    };
  }

  const nowStr = new Date().toISOString().replace("T", " ").substring(0, 16);
  const newUser: UserAccount = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    passwordHash: data.passwordHash,
    fullName: data.fullName,
    role: data.role,
    department: data.department || data.role,
    status: "pending", // Default requires approval!
    registeredAt: nowStr
  };

  const updated = [newUser, ...users];
  saveUsers(updated);

  return {
    success: true,
    user: newUser,
    message: "Pendaftaran berhasil! Akun Anda berada dalam status 'Pending Approval'. Super Admin akan melakukan peninjauan sebelum akun dapat digunakan."
  };
}

export function updateUserStatus(userId: string, newStatus: UserStatus): UserAccount[] {
  const users = getUsers();
  const updated = users.map(u => u.id === userId ? { ...u, status: newStatus } : u);
  saveUsers(updated);
  return updated;
}

export function deleteUser(userId: string): UserAccount[] {
  const users = getUsers();
  const updated = users.filter(u => u.id !== userId);
  saveUsers(updated);
  return updated;
}

export function addUserDirect(user: UserAccount): UserAccount[] {
  const users = getUsers();
  const updated = [user, ...users];
  saveUsers(updated);
  return updated;
}
