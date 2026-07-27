import { useEffect } from "react";

export default function WorkRedirect() {
  useEffect(() => {
    window.location.replace("/#work");
  }, []);
  return null;
}
