// pages/onKabul.js
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getShipmentsByPAADID,
  getAllShipments,
  getShipmentByBox,
  updateOnKabulFields,
  markExtraBox,
} from "../lib/firestore";
import BackButton from "../components/BackButton";
import styles from "../styles/OnKabul.module.css";

export default function OnKabulPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [shipments, setShipments] = useState([]);
  const [allShipments, setAllShipments] = useState([]);
  const [boxInput, setBoxInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Koli numarasına göre gruplandırılmış gönderileri saklamak için state
  const [groupedShipments, setGroupedShipments] = useState([]);

  // Veri çekme fonksiyonu
  const fetchShipments = async () => {
    if (user && userData && userData.PAAD_ID) {
      setRefreshing(true);
      setError(null);
      try {
        const shipmentsList = await getShipmentsByPAADID(userData.PAAD_ID);
        const allShipmentsList = await getAllShipments();
        // "Okutma Başarılı" olmayanları filtrele
        const filteredShipments = shipmentsList
          .filter((shipment) => shipment.onKabulDurumu !== "Okutma Başarılı")
          .sort((a, b) => {
            if (!a.onKabulDurumu && b.onKabulDurumu) return -1;
            if (a.onKabulDurumu && !b.onKabulDurumu) return 1;
            return 0;
          });
        setShipments(filteredShipments);
        setAllShipments(allShipmentsList);

        // Gönderileri koli numarasına göre gruplandır
        const grouped = {};
        filteredShipments.forEach((shipment) => {
          if (!grouped[shipment.box]) {
            grouped[shipment.box] = {
              box: shipment.box,
              quantity: shipment.quantityof_product,
              onKabulDurumu: shipment.onKabulDurumu,
              onKabulYapanKisi: shipment.onKabulYapanKisi,
              onKabulSaati: shipment.onKabulSaati,
              isApproved: shipment.isApproved,
              shipmentIds: [shipment.id], // Aynı koliye ait tüm doküman ID'leri
            };
          } else {
            // Eğer koli zaten varsa, sadece quantity'yi güncelle
            grouped[shipment.box].quantity += shipment.quantityof_product;
            grouped[shipment.box].shipmentIds.push(shipment.id);
          }
        });
        // Diziye dönüştür
        setGroupedShipments(Object.values(grouped));
      } catch (err) {
        console.error("Veri Çekme Hatası:", err);
        setError("Veriler alınırken bir hata oluştu.");
      }
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && userData) {
      fetchShipments();
    } else {
      setLoading(false);
      router.push("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, router]);

  const formatDate = (date) => {
    if (!date) return "-";
    if (date.toDate) {
      return date.toDate().toLocaleString();
    }
    const parsedDate = new Date(date);
    return isNaN(parsedDate) ? "-" : parsedDate.toLocaleString();
  };

  const handleBoxSubmit = async (e) => {
    e.preventDefault();
    if (!boxInput) return;

    try {
      const matchingDocs = groupedShipments.filter(
        (doc) => doc.box === boxInput
      );

      if (matchingDocs.length > 0) {
        const box = matchingDocs[0];
        if (box.onKabulDurumu === "Okutma Başarılı") {
          alert("Bu koli daha önce okutulmuştur.");
          return;
        }

        // Onayla ve güncelle
        await Promise.all(
          box.shipmentIds.map((docId) =>
            updateOnKabulFields(docId, userData.name)
          )
        );

        // Güncellenmiş verileri yansıt
        fetchShipments();

        alert("Koli numarası başarıyla okutuldu!");
      } else {
        // Başka mağazalarda olup olmadığını kontrol et
        const otherShipments = await getShipmentByBox(boxInput);
        if (otherShipments.length > 0) {
          // Hatalı mağazayı belirlemek için ilk bulduğu mağazayı kullan
          const targetStore = otherShipments[0].storeName || "bilinmeyen";

          // Tüm bulduğu kolileri işaretle
          await Promise.all(
            otherShipments.map((shipment) =>
              markExtraBox(shipment.id, userData.name)
            )
          );

          alert(
            `Okuttuğunuz koli ${targetStore} mağazasına gönderilmiştir ve hatalı bir şekilde size teslim edilmiştir. Lütfen Satış Operasyon ile iletişime geçin.`
          );
        } else {
          // Koli numarası "TR" veya "BX" ile başlamıyor mu kontrol et
          if (
            !boxInput.startsWith("TR") &&
            !boxInput.startsWith("BX")
          ) {
            alert(
              "Böyle bir koli sevkiyat listelerinde bulunamadı. Lütfen Satış Operasyon ile iletişime geçin."
            );
            return;
          }

          // Eğer "TR" veya "BX" ile başlıyorsa ve listede yoksa
          alert(
            "Böyle bir koli sevkiyat listelerinde bulunamadı. Lütfen Satış Operasyon ile iletişime geçin."
          );
        }
      }
      setBoxInput("");
    } catch (error) {
      console.error("Ön Kabul Güncelleme Hatası:", error);
      alert("Ön kabul işlemi sırasında bir hata oluştu.");
    }
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
      <h1>Hoş Geldiniz, {userData.name}</h1>
      <p>
        Mağaza: {userData.storeName} (PAAD ID: {userData.PAAD_ID})
      </p>

      {/* Başarılı Koliler Butonu */}
      <button
        onClick={() => router.push("/basariliKoliler")}
        className={styles.successButton}
      >
        Başarılı Koliler
      </button>

      {/* Yenile Butonu */}
      <button
        onClick={fetchShipments}
        className={styles.refreshButton}
        disabled={refreshing}
      >
        {refreshing ? "Yükleniyor..." : "Yenile"}
      </button>

      {/* Hata Mesajı */}
      {error && <p className={styles.error}>{error}</p>}

      {/* Koli Arama Input */}
      <form onSubmit={handleBoxSubmit} className={styles.form}>
        <input
          type="text"
          placeholder="Koli numarası giriniz"
          value={boxInput}
          onChange={(e) => setBoxInput(e.target.value)}
          required
          className={styles.input}
        />
        <button type="submit" className={styles.submitButton}>
          Onayla
        </button>
      </form>

      {/* Toplam Koli Sayısı */}
      <p>Toplam Koli Adedi: {groupedShipments.length}</p>

      {/* Liste Tablosu */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>Sıra No</th>
            <th className={styles.th}>Koli Numarası</th>
            <th className={styles.th}>Ürün Adedi</th>
            <th className={styles.th}>Ön Kabul Durumu</th>
            <th className={styles.th}>Ön Kabul Yapan Kişi</th>
            <th className={styles.th}>Ön Kabul Saati</th>
          </tr>
        </thead>
        <tbody>
          {groupedShipments.map((box, index) => (
            <tr key={box.box}>
              <td className={styles.td}>{index + 1}</td>
              <td className={styles.td}>{box.box}</td>
              <td className={styles.td}>{box.quantity}</td>
              <td className={styles.td}>{box.onKabulDurumu || "-"}</td>
              <td className={styles.td}>{box.onKabulYapanKisi || "-"}</td>
              <td className={styles.td}>
                {formatDate(box.onKabulSaati)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
