import { redirect } from "next/navigation";

// /skating is now /activities — keep this redirect so old bookmarks and links still work
export default function SkatingRedirect() {
  redirect("/activities");
}
