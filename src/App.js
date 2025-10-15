import React, { useEffect, useMemo, useRef, useState } from "react";
import wordsData from "./assets/words.json";
import tarihData from "./assets/tarih.json";
import verbData from "./assets/verb.json";

const STORAGE_KEY = "kelime_quiz_state_v2";
const DATASET_KEY = "kelime_quiz_dataset";

// kullanılabilir datasetler
const datasets = {
  words: wordsData,
  tarih: tarihData,
  verb: verbData,
};

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(str) {
  return (str || "")
    .toLocaleLowerCase("tr")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCorrect(userAnswer, truth) {
  const ua = normalize(userAnswer);
  const options = (truth || "").split("|").map((s) => normalize(s));
  return options.some((opt) => opt.length > 0 && ua === opt);
}

function getHint(word, revealedCount = 1) {
  if (!word) return "";
  let result = "";
  for (let i = 0; i < word.length; i++) {
    if (i < revealedCount || word[i] === " ") {
      result += word[i];
    } else {
      result += ".";
    }
  }
  return result;
}

function syllabify(word) {
  if (!word) return "";
  return word.replace(/([aeiouy])/gi, "$1-").replace(/-$/, "");
}

export default function App() {
  const [datasetName, setDatasetName] = useState("words");
  const [orderedWords, setOrderedWords] = useState(() => shuffle(wordsData));
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, passed: 0 });
  const [loaded, setLoaded] = useState(false);
  const [quizMode, setQuizMode] = useState("en2tr"); // "en2tr" veya "tr2en"
  const [hintCount, setHintCount] = useState(0);
  const inputRef = useRef(null);

  const currentDataset = datasets[datasetName];
  const total = currentDataset.length;
  const current = orderedWords[idx] || { en: "-", tr: "-" };

  const question =
    quizMode === "en2tr" ? current.en : (current.tr || "").split("|")[0];
  const correctAnswer = quizMode === "en2tr" ? current.tr : current.en;

  const remaining = Math.max(
    total - (stats.correct + stats.wrong + stats.passed),
    0
  );

  // State yükle
  useEffect(() => {
    try {
      const savedDataset = localStorage.getItem(DATASET_KEY);
      if (savedDataset && datasets[savedDataset]) {
        setDatasetName(savedDataset);
        setOrderedWords(shuffle(datasets[savedDataset]));
      }
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) {
        const parsed = JSON.parse(s);
        setIdx(parsed.idx ?? 0);
        setStats(parsed.stats || { correct: 0, wrong: 0, passed: 0 });
        setQuizMode(parsed.quizMode || "en2tr");
      }
    } catch (e) {
      console.warn("Load error", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  // State kaydet
  useEffect(() => {
    if (!loaded) return;
    const toSave = JSON.stringify({ idx, stats, quizMode });
    localStorage.setItem(STORAGE_KEY, toSave);
    localStorage.setItem(DATASET_KEY, datasetName);
  }, [idx, stats, quizMode, datasetName, loaded]);

  const onSubmit = () => {
    if (!answer.trim()) return;
    const ok = isCorrect(answer, correctAnswer);
    if (ok) {
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
      goNext();
    } else {
      setRevealed(true);
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    }
  };

  const onPass = () => {
    const w = current;
    const rest = orderedWords.slice(0, idx).concat(orderedWords.slice(idx + 1));
    const newOrder = rest.concat([w]);
    setOrderedWords(newOrder);
    setStats((s) => ({ ...s, passed: s.passed + 1 }));
    setRevealed(false);
    setAnswer("");
    setHintCount(0);
  };

  const goNext = () => {
    const nextIdx = (idx + 1) % orderedWords.length;
    setIdx(nextIdx);
    setRevealed(false);
    setAnswer("");
    setHintCount(0);
  };

  const onReveal = () => {
    setRevealed(true);
  };

  const onHint = () => {
    setHintCount(hintCount + 1);
  };

  const onResetProgress = () => {
    if (window.confirm("İstatistikler ve sıranız sıfırlansın mı?")) {
      const newOrder = shuffle(currentDataset);
      setOrderedWords(newOrder);
      setIdx(0);
      setStats({ correct: 0, wrong: 0, passed: 0 });
      setAnswer("");
      setRevealed(false);
      setHintCount(0);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const changeDataset = (name) => {
    setDatasetName(name);
    setOrderedWords(shuffle(datasets[name]));
    setIdx(0);
    setStats({ correct: 0, wrong: 0, passed: 0 });
    setAnswer("");
    setRevealed(false);
    setHintCount(0);
  };

  const progress = useMemo(() => {
    const done = stats.correct + stats.wrong + stats.passed;
    return total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  }, [stats, total]);

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center" }}>
        {quizMode === "en2tr"
          ? "İngilizce → Türkçe"
          : "Türkçe → İngilizce"}{" "}
        Quiz
      </h2>

      {/* Dataset Seçimi */}
      <div style={{ textAlign: "center", marginBottom: 10 }}>
       <button onClick={() => changeDataset("words")}>Kelimeler</button>
       <button onClick={() => changeDataset("tarih")}>Tarih</button>
       <button onClick={() => changeDataset("verb")}>Fiiller</button> {/* ✅ yeni */}
       <p>Aktif Dataset: {datasetName}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Toplam: {total}</span>
        <span>Kalan: {remaining}</span>
        <span>İlerleme: %{progress}</span>
      </div>

      <div style={{ margin: "10px 0" }}>
        <span>✅ Doğru: {stats.correct} </span> |{" "}
        <span>❌ Yanlış: {stats.wrong} </span> |{" "}
        <span>⏭ Pas: {stats.passed}</span>
      </div>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 20,
          marginTop: 10,
        }}
      >
        <h3>Soru:</h3>
        <h1>{question}</h1>

        {hintCount > 0 && (
          <p>İpucu: {getHint(correctAnswer, hintCount)}</p>
        )}
        {hintCount > 1 && <p>Hecele: {syllabify(correctAnswer)}</p>}

        <h3>Cevabın:</h3>
        <input
          ref={inputRef}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          style={{ padding: 8, borderRadius: 5, border: "1px solid #ccc" }}
        />

        {!revealed ? (
          <div style={{ marginTop: 10 }}>
            <button onClick={onSubmit}>Gönder</button>
            <button onClick={onPass}>Pass</button>
            <button onClick={onReveal}>Göster</button>
            <button onClick={onHint}>İpucu</button>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <h4>Doğru cevap:</h4>
            <p>{correctAnswer}</p>
            <button onClick={goNext}>Sonraki</button>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={onResetProgress}>Sıfırla</button>
        <button
          onClick={() => {
            const mixed = shuffle(orderedWords);
            setOrderedWords(mixed);
            setIdx(0);
            setAnswer("");
            setRevealed(false);
            setHintCount(0);
          }}
        >
          Karıştır
        </button>
        <button
          onClick={() => {
            setQuizMode(quizMode === "en2tr" ? "tr2en" : "en2tr");
            setAnswer("");
            setRevealed(false);
            setHintCount(0);
          }}
        >
          Mod Değiştir
        </button>
      </div>
    </div>
  );
}
