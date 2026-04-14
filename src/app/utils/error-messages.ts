import { ApiError } from '../services/api';

export type ErrorContext =
  | 'login'
  | 'request-otp'
  | 'verify-otp'
  | 'reset-password'
  | 'create-role'
  | 'default';

function looksLikeInvalidEmail(details: unknown): boolean {
  if (!details) {
    return false;
  }

  const serialized = JSON.stringify(details).toLowerCase();
  return (
    (serialized.includes('email') || serialized.includes('mail')) &&
    (serialized.includes('invalid') ||
      serialized.includes('invalide') ||
      serialized.includes('format') ||
      serialized.includes('valide'))
  );
}

export function toFriendlyErrorMessage(error: unknown, context: ErrorContext = 'default'): string {
  if (!(error instanceof ApiError)) {
    return 'Une erreur est survenue. Veuillez réessayer.';
  }

  if (looksLikeInvalidEmail(error.details)) {
    return 'Adresse email invalide.';
  }

  switch (context) {
    case 'login':
      if (error.status === 401) {
        return 'Email ou mot de passe invalide.';
      }
      if (error.status === 422 || error.status === 400) {
        return 'Adresse email ou mot de passe invalide.';
      }
      break;
    case 'request-otp':
      if (error.status === 404) {
        return 'Aucun compte associé à cette adresse email.';
      }
      if (error.status === 422 || error.status === 400) {
        return 'Adresse email invalide.';
      }
      break;
    case 'verify-otp':
      if (error.status === 400 || error.status === 422) {
        return 'Code OTP invalide.';
      }
      if (error.status === 410) {
        return 'Le code OTP a expiré. Demandez un nouveau code.';
      }
      break;
    case 'reset-password':
      if (error.status === 400 || error.status === 422) {
        return 'Impossible de réinitialiser le mot de passe avec les informations fournies.';
      }
      break;
    case 'create-role':
      if (error.status === 409) {
        return 'Ce rôle existe déjà.';
      }
      if (error.status === 400 || error.status === 422) {
        return 'Les informations du rôle sont invalides.';
      }
      return 'Le rôle n’a pas pu être créé.';
    default:
      break;
  }

  if (error.status === 0) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion.';
  }
  if (error.status === 408) {
    return 'Le serveur met trop de temps à répondre. Réessayez.';
  }
  if (error.status >= 500) {
    return 'Erreur serveur. Veuillez réessayer plus tard.';
  }

  return 'Une erreur est survenue. Veuillez réessayer.';
}
