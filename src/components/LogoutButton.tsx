import { signOutAction } from "@/lib/auth-actions";

export default function LogoutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-xs text-sky-600 dark:text-accent hover:text-sky-700 font-medium transition-colors"
      >
        Logout
      </button>
    </form>
  );
}
