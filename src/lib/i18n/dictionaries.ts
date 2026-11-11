const fr = {
  app: { name: "EduPlatform", tagline: "Apprendre, enseigner, progresser — partout." },
  common: {
    signOut: "Se déconnecter",
    loading: "Chargement…",
    seeAll: "Tout voir",
    empty: "Rien à afficher pour le moment.",
    language: "Langue",
    menu: "Menu",
    close: "Fermer",
    retry: "Réessayer",
    error: "Une erreur est survenue.",
  },
  roles: { super_admin: "Super administrateur", teacher: "Enseignant", student: "Élève" },
  auth: {
    title: "Connexion",
    subtitle: "Accédez à votre espace personnel.",
    email: "Adresse e-mail",
    password: "Mot de passe",
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Les comptes sont créés par votre établissement ou votre enseignant.",
    errors: {
      invalid: "Vérifiez l'adresse e-mail et le mot de passe (6 caractères minimum).",
      credentials: "Identifiants incorrects.",
      inactive: "Ce compte est suspendu ou désactivé. Contactez l'administration.",
      unknown: "Connexion impossible pour le moment. Réessayez.",
    },
  },
  nav: {
    dashboard: "Tableau de bord",
  },
  admin: {
    title: "Vue d'ensemble de la plateforme",
    stats: {
      schools: "Établissements",
      teachers: "Enseignants",
      students: "Élèves",
      classes: "Classes",
    },
    accountStatus: "Statut des comptes",
    recentAccounts: "Derniers comptes créés",
    recentActivity: "Activité récente",
    status: { active: "Actifs", suspended: "Suspendus", disabled: "Désactivés" },
  },
  teacher: {
    greeting: "Bonjour",
    stats: {
      classes: "Classes",
      enrollments: "Élèves inscrits",
      courses: "Cours",
      toGrade: "Copies à corriger",
    },
    upcomingMeetings: "Prochaines séances en ligne",
    latestSubmissions: "Dernières copies reçues",
  },
  student: {
    greeting: "Bonjour",
    stats: {
      subjects: "Matières",
      dueSoon: "Devoirs à rendre",
      exams: "Évaluations ouvertes",
      average: "Moyenne publiée",
    },
    upcomingAssignments: "Devoirs à venir",
    latestGrades: "Dernières notes",
    upcomingMeetings: "Prochaines séances en ligne",
    due: "À rendre le",
  },
};

export type Dictionary = typeof fr;

const ar: Dictionary = {
  app: { name: "EduPlatform", tagline: "تعلّم، علّم، تقدّم — في كل مكان." },
  common: {
    signOut: "تسجيل الخروج",
    loading: "جارٍ التحميل…",
    seeAll: "عرض الكل",
    empty: "لا يوجد ما يُعرض حاليًا.",
    language: "اللغة",
    menu: "القائمة",
    close: "إغلاق",
    retry: "إعادة المحاولة",
    error: "حدث خطأ ما.",
  },
  roles: { super_admin: "المشرف العام", teacher: "أستاذ", student: "تلميذ" },
  auth: {
    title: "تسجيل الدخول",
    subtitle: "ادخل إلى فضائك الشخصي.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    submit: "دخول",
    submitting: "جارٍ الدخول…",
    noAccount: "يتم إنشاء الحسابات من طرف المؤسسة أو الأستاذ.",
    errors: {
      invalid: "تحقق من البريد الإلكتروني وكلمة المرور (6 أحرف على الأقل).",
      credentials: "بيانات الدخول غير صحيحة.",
      inactive: "هذا الحساب موقوف أو معطّل. اتصل بالإدارة.",
      unknown: "تعذّر الدخول حاليًا. أعد المحاولة.",
    },
  },
  nav: {
    dashboard: "لوحة القيادة",
  },
  admin: {
    title: "نظرة عامة على المنصة",
    stats: { schools: "المؤسسات", teachers: "الأساتذة", students: "التلاميذ", classes: "الأقسام" },
    accountStatus: "حالة الحسابات",
    recentAccounts: "آخر الحسابات المُنشأة",
    recentActivity: "آخر النشاطات",
    status: { active: "نشطة", suspended: "موقوفة", disabled: "معطّلة" },
  },
  teacher: {
    greeting: "مرحبًا",
    stats: { classes: "الأقسام", enrollments: "التلاميذ المسجّلون", courses: "الدروس", toGrade: "فروض للإصلاح" },
    upcomingMeetings: "الحصص المباشرة القادمة",
    latestSubmissions: "آخر الفروض المستلمة",
  },
  student: {
    greeting: "مرحبًا",
    stats: { subjects: "المواد", dueSoon: "فروض للإنجاز", exams: "تقييمات مفتوحة", average: "المعدل المنشور" },
    upcomingAssignments: "الفروض القادمة",
    latestGrades: "آخر الأعداد",
    upcomingMeetings: "الحصص المباشرة القادمة",
    due: "آخر أجل",
  },
};

export const dictionaries = { fr, ar } as const;
