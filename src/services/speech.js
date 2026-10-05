// Dictée vocale (Web Speech API, fr-FR). Sur la plupart des navigateurs l'audio est envoyé à un service distant :
// l'utilisateur doit l'accepter une fois (consentement mémorisé dans les préférences).

export function speechSupported() {
  return typeof globalThis !== 'undefined' && !!(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
}

/**
 * Démarre une dictée. Callbacks : onInterim(texte), onFinal(texte), onEnd(), onError(message).
 * Retourne { stop() }.
 */
export function startDictation({ onInterim, onFinal, onEnd, onError }) {
  const Rec = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
  if (!Rec) { onError?.('La dictée n\'est pas disponible sur ce navigateur.'); onEnd?.(); return { stop() {} }; }
  const rec = new Rec();
  rec.lang = 'fr-FR';
  rec.interimResults = true;
  rec.continuous = true;
  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const t = ev.results[i][0].transcript;
      if (ev.results[i].isFinal) onFinal?.(t.trim()); else interim += t;
    }
    onInterim?.(interim);
  };
  rec.onerror = (ev) => {
    const map = { 'not-allowed': 'Micro refusé : autorisez-le dans le navigateur.', 'service-not-allowed': 'Dictée refusée par le navigateur.', 'no-speech': 'Aucune voix détectée.', network: 'Dictée indisponible sans connexion.', 'audio-capture': 'Aucun micro détecté.' };
    if (ev.error !== 'aborted') onError?.(map[ev.error] || `Erreur de dictée (${ev.error}).`);
  };
  rec.onend = () => onEnd?.();
  try { rec.start(); } catch (e) { onError?.('Impossible de démarrer la dictée.'); onEnd?.(); }
  return { stop() { try { rec.stop(); } catch { /* déjà arrêtée */ } } };
}
