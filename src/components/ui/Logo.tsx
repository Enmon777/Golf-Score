import { useResource } from "../../hooks/useResource";
import { logoUrl } from "../../services/logoService";
export function Logo({ path, label }: { path: string; label: string }) {
  const { data } = useResource(path, logoUrl);
  return data ? (
    <img className="tournament-logo" src={data} alt={label} />
  ) : null;
}
export function LogoInput() {
  return (
    <label>
      Logo image (optional)
      <input type="file" name="logo" accept="image/jpeg,image/png,image/webp" />
    </label>
  );
}
