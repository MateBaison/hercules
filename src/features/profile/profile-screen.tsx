"use client";
import { useState } from "react";
import { languages } from "@/data/translations";
import { useApp } from "@/state/app-provider";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonalForm } from "./personal-form";
import { AccountPanel } from "./account-panel";
import { readSnapshotJson } from "@/domain/legacy/read-snapshot";
import { accountCacheKey, backupRawCache } from "@/lib/storage/account-cache";
import { fingerprint } from "@/lib/storage/fingerprint";
const languageNames: Record<string, string> = {
  es: "🇪🇸 Español",
  en: "🇬🇧 English",
  fr: "🇫🇷 Français",
  zh: "🇨🇳 中文",
  hi: "🇮🇳 हिन्दी",
  ar: "🇸🇦 العربية",
  de: "🇩🇪 Deutsch",
  it: "🇮🇹 Italiano",
  pt: "🇵🇹 Português",
};
export function ProfileScreen() {
  const { snapshot, change, user, notify, t } = useApp(),
    [settings, setSettings] = useState(false),
    [social, setSocial] = useState({
      instagram: snapshot.profile.instagram ?? "",
      snapchat: snapshot.profile.snapchat ?? "",
    });
  const dirtySocial =
    social.instagram !== (snapshot.profile.instagram ?? "") ||
    social.snapchat !== (snapshot.profile.snapchat ?? "");
  return (
    <>
      <div className="page-heading flex items-center justify-between">
        <div>
          <h1>{t("Perfil", "Profile")}</h1>
          <p>{t("Tus datos y preferencias", "Your details and preferences")}</p>
        </div>
        <Button
          variant="secondary"
          aria-label="Configuración"
          onClick={() => setSettings(true)}
        >
          ⚙
        </Button>
      </div>
      <section className="panel">
        <h2 className="mb-4 text-xl font-bold">
          {t("Datos personales", "Personal details")}
        </h2>
        <PersonalForm key={fingerprint(snapshot.profile)} />
      </section>
      <details className="panel">
        <summary className="font-bold">
          {t("Redes sociales", "Social networks")}
        </summary>
        <div className="mt-4 space-y-4">
          {(["instagram", "snapchat"] as const).map((network) => (
            <label className="block" key={network}>
              {network === "instagram" ? "Instagram" : "Snapchat"}
              <Input
                value={social[network]}
                onChange={(event) =>
                  setSocial({ ...social, [network]: event.target.value })
                }
                placeholder="@usuario o enlace"
              />
            </label>
          ))}
          <p className="text-sm text-muted-foreground">
            {t(
              "Estos enlaces muestran tus perfiles; no vinculan ni autorizan cuentas. Usá Compartir imagen para enviar un resumen visual al menú del teléfono.",
              "These links display your profiles; they do not connect accounts. Use Share image for the phone's native share menu.",
            )}
          </p>
          {dirtySocial && (
            <Button
              onClick={() => {
                if (
                  change((draft) => {
                    draft.profile.instagram = social.instagram;
                    draft.profile.snapchat = social.snapchat;
                  })
                )
                  notify("Cambios guardados");
              }}
            >
              Guardar cambios de redes
            </Button>
          )}
        </div>
      </details>
      <section className="panel">
        <h2 className="mb-3 font-bold">Copia de tus datos</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          La copia incluye perfil, historial y fotos. Guardala de forma privada.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            const url = URL.createObjectURL(
                new Blob([JSON.stringify(snapshot)], {
                  type: "application/json",
                }),
              ),
              link = document.createElement("a");
            link.href = url;
            link.download = "hercules-datos.json";
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 30_000);
          }}
        >
          Exportar copia
        </Button>
        <label className="mt-4 block">
          Importar copia
          <Input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 25 * 1024 * 1024)
                return notify("La copia supera 25 MB.");
              const read = readSnapshotJson(await file.text());
              if (!read.ok)
                return notify(
                  "La copia no es válida. No se reemplazó ningún dato.",
                );
              if (
                !confirm(
                  "¿Reemplazar los datos de esta cuenta con la copia? Se conservará una recuperación local de los datos actuales.",
                )
              )
                return;
              try {
                backupRawCache(localStorage, accountCacheKey(user.id));
              } catch {
                return notify(
                  "No hay espacio para conservar la recuperación. No importamos datos.",
                );
              }
              if (
                change((draft) => {
                  Object.keys(draft).forEach((key) => {
                    delete draft[key];
                  });
                  Object.assign(draft, read.snapshot);
                })
              )
                notify("Copia importada; sincronizando…");
            }}
          />
        </label>
      </section>
      <AccountPanel />
      <AppDialog
        open={settings}
        onClose={() => setSettings(false)}
        title={t("Configuración", "Settings")}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget),
              weight = form.get("weight") === "lb" ? "lb" : "kg",
              height = form.get("height") === "ft" ? "ft" : "cm",
              distance = form.get("distance") === "mi" ? "mi" : "km",
              language = String(form.get("language"));
            if (
              change((draft) => {
                if (weight !== draft.settings.weight) {
                  const factor = weight === "lb" ? 2.20462 : 1 / 2.20462;
                  draft.profile.weight =
                    Math.round(
                      Number(draft.profile.weight ?? 75) * factor * 10,
                    ) / 10;
                  draft.workout?.entries.forEach((entry) =>
                    entry.sets.forEach((set) => {
                      if (set.kg != null)
                        set.kg = Math.round(set.kg * factor * 10) / 10;
                    }),
                  );
                }
                if (height !== draft.settings.height)
                  draft.profile.height =
                    Math.round(
                      Number(draft.profile.height ?? 175) *
                        (height === "ft" ? 1 / 30.48 : 30.48) *
                        100,
                    ) / 100;
                Object.assign(draft.settings, {
                  weight,
                  height,
                  distance,
                  language,
                });
              })
            ) {
              setSettings(false);
              notify("Configuración guardada");
            }
          }}
        >
          <label className="block">
            Peso
            <select name="weight" defaultValue={snapshot.settings.weight}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </label>
          <label className="block">
            Altura
            <select name="height" defaultValue={snapshot.settings.height}>
              <option value="cm">cm</option>
              <option value="ft">ft</option>
            </select>
          </label>
          <label className="block">
            Distancia
            <select name="distance" defaultValue={snapshot.settings.distance}>
              <option value="km">km</option>
              <option value="mi">mi</option>
            </select>
          </label>
          <label className="block">
            Idioma
            <select name="language" defaultValue={snapshot.settings.language}>
              {languages.map((language) => (
                <option key={language} value={language}>
                  {languageNames[language]}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">Guardar configuración</Button>
        </form>
      </AppDialog>
    </>
  );
}
