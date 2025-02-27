import { useRouter } from "next/router";
import { useEffect } from "react";
import { logoutUser } from "../lib/auth";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import styles from "../styles/MainPage.module.css";

export default function MainPage() {
  const router = useRouter();
  const { token, userData, logout } = useAuth();
  console.log("to_sap_location_id:", userData.to_sap_location_id);
  useEffect(() => {
    if (!userData && router.isReady) {
      router.push("/").catch(() => {});
    }
  }, [userData, router]);

  const handleSignOut = async () => {
    try {
      await logoutUser(token);
      logout();
      router.push("/").catch(() => {});
    } catch (error) {
      console.error("Çıkış Hatası:", error);
      alert("Çıkış işlemi sırasında bir hata oluştu.");
    }
  };

  if (!userData) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>Hoş Geldiniz, {userData.name}</h1>
      <p>Mağaza: {userData.storeName} (PAAD ID: {userData.to_sap_location_id})</p>
      <div className={styles.buttonContainer}>
        <button onClick={() => router.push("/onKabul")} className={styles.navButton}>
          Ön Kabul
        </button>
        <button onClick={() => router.push("/malKabul")} className={styles.navButton}>
          Mal Kabul
        </button>
        <button onClick={handleSignOut} className={styles.signOutButton}>
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}
