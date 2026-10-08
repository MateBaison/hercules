"use client";
import { menstrualCalendarAllowed } from "@/domain/menstrual-calendar";
import { localeFor } from "@/data/translations";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProfilePhotoEditor } from "./profile-photo-editor";
import { MenstrualCalendar } from "./menstrual-calendar";
import { compressedPhoto, safePhoto } from "@/lib/browser/photos";
const codes =
  "ADAEAFAGAIALAMAOAQARASATAUAWAXAZBABBBDBEBFBGBHBIBJBLBMBNBOBQBRBSBTBVBWBYBZCACCCDCFCGCHCICKCLCMCNCOCRCUCVCWCXCYCZDEDJDKDMDODZECEEEGEHERESETFIFJFKFMFOFRGAGBGDGEGFGGGHGIGLGMGNGPGQGRGSGTGUGWGYHKHMHNHRHTHUIDIEILIMINIOIQIRISITJEJMJOJPKEKGKHKIKMKNKPKRKWKYKZLALBLCLILKLRLSLTLULVLYMAMCMDMEMFMGMHMKMLMMMNMOMPMQMRMSMTMUMVMWMXMYMZNANCNENFNGNINLNONPNRNUNZOMPAPEPFPGPHPKPLPMPNPRPSPTPWPYQARERORSRURWSASBSCSDSESGSHSISJSKSLSMSNSOSRSSSTSVSXSYSZTCTDTFTGTHTJTKTLTMTNTOTRTTTVTWTZUAUGUMUSUYUZVAVCVEVGVIVNVUWFWSYEYTZAZMZWXK".match(
    /../g,
  ) ?? [];

export function PersonalForm({ onboarding = false }: { onboarding?: boolean }) {
  const { snapshot, user, change, flush, notify, t, holdRefresh } = useApp(),
    router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoSource, setPhotoSource] = useState<string | null>(null);
  const [draft, setDraft] = useState(snapshot.profile),
    [busy, setBusy] = useState(false),
    [country, setCountry] = useState(snapshot.profile.country ?? "");
  const displayNames = new Intl.DisplayNames(
    [localeFor(snapshot.settings.language)],
    { type: "region" },
  );
  const countries = codes
    .map((code) => displayNames.of(code) ?? code)
    .sort((a, b) => a.localeCompare(b));
  const changed = JSON.stringify(draft) !== JSON.stringify(snapshot.profile);
  useEffect(
    () => (changed ? holdRefresh() : undefined),
    [changed, holdRefresh],
  );
  const set = (key: string, value: string | number) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  return (
    <form
      className="personal-form space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const name = z.string().trim().min(1).max(80).safeParse(draft.name);
        if (!name.success)
          return notify(t("Ingresá tu nombre.", "Enter your name."));
        setBusy(true);
        if (
          !change((state) => {
            state.profile = {
              ...draft,
              name: name.data,
              email: user.email,
              onboardingComplete: true,
            };
          })
        ) {
          setBusy(false);
          return;
        }
        const saved = await flush();
        setBusy(false);
        if (onboarding && saved) {
          router.replace("/home");
          router.refresh();
        } else
          notify(
            saved
              ? t("Perfil guardado", "Profile saved")
              : t(
                  "Guardado en este dispositivo; falta sincronizar.",
                  "Saved on this device; sync is pending.",
                ),
          );
      }}
    >
      <ProfilePhotoEditor
        source={photoSource}
        onClose={() => setPhotoSource(null)}
        onApply={(photo) => {
          setDraft((previous) => ({ ...previous, photo }));
          setPhotoSource(null);
        }}
      />
      <div className="profile-summary-grid">
        <div className="profile-photo-controls">
          {safePhoto(draft.photo) ? (
            <img
              src={draft.photo}
              alt="Foto de perfil"
              className="profile-avatar"
            />
          ) : (
            <div className="profile-avatar">
              {draft.name?.slice(0, 1).toUpperCase() ?? "H"}
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            className="profile-photo-pick"
            disabled={busy}
            onClick={() => photoInput.current?.click()}
          >
            {t("Elegir foto", "Choose photo")}
          </Button>
          <input
            ref={photoInput}
            className="sr-only"
            type="file"
            aria-label={t("Cambiar foto", "Change photo")}
            accept="image/*"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                const photo = await compressedPhoto(file, 1200);
                setPhotoSource(photo);
              } catch (error) {
                notify(
                  error instanceof Error
                    ? error.message
                    : "No se pudo cargar la foto.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
          {safePhoto(draft.photo) && (
            <Button
              type="button"
              variant="destructive-solid"
              className="profile-photo-pick profile-photo-remove"
              disabled={busy}
              onClick={() =>
                setDraft((previous) => ({ ...previous, photo: "" }))
              }
            >
              {t("Eliminar foto", "Remove photo")}
            </Button>
          )}
        </div>
        <div className="space-y-3">
          <label className="block">
            {t("Nombre", "Name")}
            <Input
              required
              maxLength={80}
              value={draft.name ?? ""}
              onChange={(event) => set("name", event.target.value)}
            />
          </label>
          <label className="block">
            {t("Email de contacto", "Contact email")}
            <Input
              type="email"
              aria-label={t("Email de contacto", "Contact email")}
              value={user.email}
              readOnly
              className="profile-account-email"
              autoComplete="email"
              aria-describedby="profile-email-help"
            />
            <small
              id="profile-email-help"
              className="mt-2 block text-muted-foreground"
            >
              {t(
                "Correo de tu cuenta. Para cambiarlo, será necesario contactar a soporte.",
                "Account email. Changing it will require contacting support.",
              )}
            </small>
          </label>
        </div>
      </div>
      <div className="form-grid">
        <label>
          {t("Fecha de nacimiento", "Birth date")}
          <Input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={draft.birth ?? ""}
            onChange={(event) => set("birth", event.target.value)}
          />
        </label>
        <label>
          {t("País", "Country")}
          <Input
            list="countries"
            value={country}
            placeholder={t("Buscar país", "Search country")}
            onChange={(event) => {
              setCountry(event.target.value);
              set("country", event.target.value);
            }}
          />
          <datalist id="countries">
            {countries.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>
        <label>
          {t("Altura", "Height")} ({snapshot.settings.height})
          <select
            value={Number(draft.height) || 175}
            onChange={(event) => set("height", Number(event.target.value))}
          >
            {[
              ...new Set([
                Number(draft.height) || 175,
                ...(snapshot.settings.height === "ft"
                  ? Array.from(
                      { length: 61 },
                      (_, i) => Math.round((3 + i * 0.1) * 10) / 10,
                    )
                  : Array.from({ length: 151 }, (_, i) => 100 + i)),
              ]),
            ]
              .sort((a, b) => a - b)
              .map((height) => (
                <option key={height} value={height}>
                  {height}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("Peso", "Weight")} ({snapshot.settings.weight})
          <select
            value={Number(draft.weight) || 75}
            onChange={(event) => set("weight", Number(event.target.value))}
          >
            {[
              ...new Set([
                Number(draft.weight) || 75,
                ...Array.from({ length: 801 }, (_, index) => 25 + index * 0.5),
              ]),
            ]
              .sort((a, b) => a - b)
              .map((weight) => (
                <option key={weight} value={weight}>
                  {weight}
                </option>
              ))}
          </select>
        </label>
        <label>
          {t("Género", "Gender")}
          <select
            value={draft.gender ?? ""}
            onChange={(event) => set("gender", event.target.value)}
          >
            <option value="">
              {t("Prefiero no decirlo", "Prefer not to say")}
            </option>
            <option value="hombre">{t("Hombre", "Male")}</option>
            <option value="mujer">{t("Mujer", "Female")}</option>
            <option value="no_binario">{t("No binario", "Non-binary")}</option>
            <option value="otro">{t("Otro", "Other")}</option>
          </select>
        </label>
        {menstrualCalendarAllowed(draft) &&
          (["mujer", "no_binario", "otro"].includes(draft.gender ?? "") ||
            draft.menstrualCalendar?.enabled ||
            (draft.menstrualCalendar?.dates?.length ?? 0) > 0) && (
            <MenstrualCalendar
              value={draft.menstrualCalendar}
              onChange={(value) =>
                setDraft((previous) => ({
                  ...previous,
                  menstrualCalendar: {
                    ...previous.menstrualCalendar,
                    ...value,
                  },
                }))
              }
            />
          )}
      </div>
      {(changed || onboarding) && (
        <Button type="submit" className="w-full" disabled={busy}>
          {busy
            ? t("Guardando…", "Saving…")
            : onboarding
              ? t("Crear perfil y entrar", "Create profile and enter")
              : t("Guardar cambios", "Save changes")}
        </Button>
      )}
    </form>
  );
}
