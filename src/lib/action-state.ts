/** État renvoyé par les Server Actions de formulaire (partagé client/serveur). */
export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Valeurs soumises, renvoyées en cas d'erreur pour ne pas vider le formulaire. */
  values?: Record<string, string>;
};

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
