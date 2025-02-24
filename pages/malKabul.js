// pages/malKabul.js
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import FocusLockInput from "../components/FocusLockInput"; // Yolunuzu ayarlayın
import { useAuth } from "../context/AuthContext";
import { 
  getBoxesForBasariliKoliler, 
  getBoxesForBasariliKolilerByPreAccept 
} from "../lib/firestore"; // Her iki fonksiyonu da import ediyoruz.
import BackButton from "../components/BackButton";
import { useNotification } from "../context/NotificationContext";
import styles from "../styles/MalKabul.module.css";

const MalKabul = () => {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [boxInput, setBoxInput] = useState("");
  const { showNotification } = useNotification();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  /**
   * Mal Kabul için kolileri çekme:
   * - Hem getBoxesForBasariliKoliler (sorgu: paad_id) hem
   * - getBoxesForBasariliKolilerByPreAccept (sorgu: pre_accept_wh_id)
   * fonksiyonlarından gelen sonuçları birleştirip,
   * on_kabul_durumu "1" veya "2" olanları alır.
   * Sonrasında aynı koli numarası için kayıtları gruplandırır.
   */
  const fetchBoxes = async () => {
    if (user && userData && userData.paad_id) {
      setLoading(true);
      setError(null);
      try {
        // İki farklı sorgudan verileri çekiyoruz:
        const boxesByPaad = await getBoxesForBasariliKoliler(userData.paad_id);
        const boxesByPreAccept = await getBoxesForBasariliKolilerByPreAccept(userData.paad_id);
        // İki sonucu birleştiriyoruz:
        const mergedBoxes = [...boxesByPaad, ...boxesByPreAccept];
        // Aynı koli numarasına sahip çift kayıtları kaldırıyoruz:
        const uniqueBoxes = mergedBoxes.reduce((acc, curr) => {
          if (!acc.find(item => item.box === curr.box)) {
            acc.push(curr);
          }
          return acc;
        }, []);
        // Şimdi, yalnızca on_kabul_durumu "1" veya "2" olanları alıyoruz.
        const validBoxes = uniqueBoxes.filter((shipment) => {
          const status = String(shipment.on_kabul_durumu);
          return status === "1" || status === "2";
        });
        // Grup oluşturma: Aynı koli numarasına göre, toplam ürün adedi (totalCount) 
        // ve okutulan ürün adedi (scannedCount) hesaplanıyor.
        const grouped = {};
        validBoxes.forEach((shipment) => {
          if (!grouped[shipment.box]) {
            grouped[shipment.box] = {
              box: shipment.box,
              shipment_no: shipment.shipment_no || "-",
              shipment_date: shipment.shipment_date || "-",
              totalCount: 0,    // Koli içerisindeki toplam shipment sayısı
              scannedCount: 0,  // Yalnızca mal_kabul_durumu "1" olanların sayısı
              from_location: shipment.from_location || "-",
            };
          }
          grouped[shipment.box].totalCount++;
          if (String(shipment.mal_kabul_durumu) === "1") {
            grouped[shipment.box].scannedCount++;
          }
        });
        setBoxes(Object.values(grouped));
      } catch (err) {
        console.error("Mal Kabul Kolileri Çekme Hatası:", err);
        setError("Mal kabul kolileri alınırken bir hata oluştu.");
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && userData) {
      fetchBoxes();
    } else {
      setLoading(false);
      router.push("/");
    }
  }, [user, userData, router]);

  /**
   * Koli numarası girildiğinde, eğer o koli listede varsa detay sayfasına yönlendirme.
   */
  const handleBoxSubmit = (e) => {
    e.preventDefault();
    if (!boxInput) return;
    const exists = boxes.some((box) => box.box === boxInput);
    if (exists) {
      router.push(`/malKabulDetay?box=${encodeURIComponent(boxInput)}`);
    } else {
      alert("Girdiğiniz koli numarası mevcut değil.");
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    const parsedDate = new Date(date);
    return isNaN(parsedDate) ? "-" : parsedDate.toLocaleString();
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Yükleniyor...</p>
      </div>
    );
  }
  if (!user || !userData) {
    return null;
  }

  return (
    <div className={styles.container}>
      <BackButton />
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <button onClick={() => setKeyboardOpen(!keyboardOpen)}>
          {keyboardOpen ? "Kapat" : "Klavye Aç"}
        </button>
      </div>
      <h1>Mal Kabul Kolileri</h1>
      <p>
        Mağaza: {userData.storeName} (PAAD ID: {userData.paad_id})
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {/* Koli Arama Formu */}
      <form onSubmit={handleBoxSubmit} className={styles.form}>
        <FocusLockInput
          value={boxInput}
          onChange={(e) => setBoxInput(e.target.value)}
          onEnter={handleBoxSubmit}
          placeholder="Koli numarası giriniz"
          className={styles.input}
          autoFocus={true}
          required
          enableKeyboard={keyboardOpen}
        />
        <button type="submit" className={styles.submitButton} disabled={loading}>
          Detay Görüntüle
        </button>
      </form>
      <p>Toplam Koli Sayısı: {boxes.length}</p>
      {/* Koliler Tablosu */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Sıra No</th>
              <th className={styles.th}>Koli Numarası</th>
              <th className={styles.th}>Ürün Adedi</th>
              <th className={styles.th}>Okutulan Ürünler</th>
            </tr>
          </thead>
          <tbody>
            {boxes.map((box, index) => (
              <tr key={box.box}>
                <td className={styles.td}>{index + 1}</td>
                <td className={styles.td}>{box.box}</td>
                <td className={styles.td}>{box.totalCount}</td>
                <td className={styles.td}>{box.scannedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MalKabul;
