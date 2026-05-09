import { useEffect } from "react";

function NurseIndex() {
  useEffect(() => {
    window.location.replace("/nurse/patients");
  }, []);
  return null;
}

export default NurseIndex;
