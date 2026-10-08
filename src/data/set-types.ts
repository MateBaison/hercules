export const setTypeLabels: Record<
  string,
  readonly [string, string, string, string]
> = {
  es: ["Calentamiento", "Normal", "Fallo", "Descendente"],
  en: ["Warm-up", "Normal", "Failure", "Drop set"],
  fr: ["Échauffement", "Normale", "Échec", "Dégressive"],
  de: ["Aufwärmen", "Normal", "Muskelversagen", "Dropsatz"],
  it: ["Riscaldamento", "Normale", "Cedimento", "Discendente"],
  pt: ["Aquecimento", "Normal", "Falha", "Descendente"],
  zh: ["热身", "常规", "力竭", "递减"],
  hi: ["वार्म-अप", "सामान्य", "विफलता", "ड्रॉप सेट"],
  ar: ["إحماء", "عادية", "فشل عضلي", "تنازلية"],
};
export function localizedSetTypes(language: string) {
  const names = setTypeLabels[language] ?? setTypeLabels.en!;
  return (["warmup", "normal", "failure", "drop"] as const).map(
    (id, index) => ({
      id,
      name: names[index]!,
      letter: Array.from(names[index]!)[0]!.toUpperCase(),
    }),
  );
}
