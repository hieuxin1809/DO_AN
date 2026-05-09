import { useEffect } from "react";

function DoctorIndex() {
  useEffect(() => {
    window.location.replace("/doctor/patients");
  }, []);
  return null;
}

export default DoctorIndex;
