// pages/malKabul.js
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../_app"; // Auth Hook'u kullanıyoruz
import BackButton from "../components/BackButton";

const MalKabul = () => {
  const router = useRouter();
  const { user, userData } = useAuth();

  useEffect(() => {
    if (!user && !loading) {
      router.push("/");
    }
  }, [user, router]);

  if (!user || !userData) {
    return <p>Yükleniyor...</p>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <BackButton />
      <h1>Mal Kabul Sayfası</h1>
      <p>Bu sayfa henüz geliştirilmemiştir.</p>
    </div>
  );
};

export default MalKabul;
