import { redirect } from "next/navigation";

// 서버함수 redirect를 통해 브라우저에 띄우기 전에 곧바로 이동시킨다.
export default function RootPage() {
  redirect("/dashboard");
}
