export const missions = [
  {
    id: "x-01",
    number: 1,
    grade: 10,
    world: "Pulau Logika",
    icon: "◇",
    title: "Gerbang Algoritma",
    subtitle: "Kenali cara berpikir komputasional",
    concept: "Algoritma",
    type: "quiz",
    xp: 80,
    prompt: "Sebuah robot harus membuat teh. Urutan instruksi manakah yang paling tepat dan tidak ambigu?",
    lesson: "Algoritma adalah urutan langkah yang logis, terbatas, dan cukup jelas untuk mencapai tujuan.",
    hint: "Perhatikan apakah air dipanaskan sebelum dituangkan.",
    options: [
      "Masukkan teh → tuang air dingin → nyalakan ketel",
      "Panaskan air → masukkan teh ke cangkir → tuang air panas → tunggu",
      "Siapkan cangkir → minum → masukkan teh",
      "Panaskan air dan lakukan langkah lain sesuka robot"
    ],
    answer: 1,
    explanation: "Urutan kedua memiliki langkah yang runtut, masuk akal, dan dapat dijalankan tanpa menebak."
  },
  {
    id: "x-02",
    number: 2,
    grade: 10,
    world: "Pulau Logika",
    icon: ">_",
    title: "Sinyal Variabel",
    subtitle: "Simpan data lalu tampilkan hasilnya",
    concept: "Variabel & output",
    type: "code",
    xp: 100,
    prompt: "Lengkapi program agar variabel nama berisi \"Raka\", kelas berisi 10, dan program mencetak tepat: Raka belajar Python di kelas 10",
    lesson: "Variabel memberi nama pada data. Fungsi print() menampilkan nilai, dan f-string memudahkan kita menyisipkan variabel ke dalam teks.",
    hint: "Gunakan print(f\"{nama} belajar Python di kelas {kelas}\").",
    starter: "nama = \"Raka\"\nkelas = 10\n\n# Tampilkan kalimat yang diminta\n",
    checks: [
      { label: "Variabel nama bernilai Raka", expression: "nama", expected: "Raka" },
      { label: "Variabel kelas bernilai 10", expression: "kelas", expected: 10 }
    ],
    outputExpected: "Raka belajar Python di kelas 10"
  },
  {
    id: "x-03",
    number: 3,
    grade: 10,
    world: "Pulau Logika",
    icon: "⇅",
    title: "Percabangan Energi",
    subtitle: "Susun keputusan if–else",
    concept: "Percabangan",
    type: "arrange",
    xp: 100,
    prompt: "Susun potongan kode agar status bernilai \"aman\" saat energi minimal 70, dan \"isi ulang\" jika kurang.",
    lesson: "Percabangan membuat program memilih tindakan berdasarkan kondisi. Indentasi menandai blok yang dijalankan.",
    hint: "Kondisi if selalu diikuti blok berindentasi, lalu else.",
    blocks: [
      "energi = 82",
      "if energi >= 70:",
      "    status = \"aman\"",
      "else:",
      "    status = \"isi ulang\"",
      "print(status)"
    ]
  },
  {
    id: "x-04",
    number: 4,
    grade: 10,
    world: "Pulau Logika",
    icon: "↻",
    title: "Menara Perulangan",
    subtitle: "Akumulasikan data dengan loop",
    concept: "Perulangan",
    type: "code",
    xp: 120,
    prompt: "Gunakan for untuk menjumlahkan angka 1 sampai 5 ke variabel total. Cetak total pada akhir program.",
    lesson: "Perulangan for memproses setiap nilai dalam sebuah urutan. range(1, 6) menghasilkan 1, 2, 3, 4, 5.",
    hint: "Mulai total dari 0, lalu tambahkan setiap angka di dalam loop.",
    starter: "total = 0\n\n# Buat perulangan 1 sampai 5 di sini\n\nprint(total)\n",
    checks: [{ label: "Total akhir bernilai 15", expression: "total", expected: 15 }],
    outputExpected: "15"
  },
  {
    id: "xi-05",
    number: 5,
    grade: 11,
    world: "Kepulauan Data",
    icon: "[ ]",
    title: "Kapsul List",
    subtitle: "Kelola sekumpulan nilai",
    concept: "List",
    type: "quiz",
    xp: 110,
    prompt: "Diberikan nilai = [78, 92, 84, 90]. Ekspresi mana yang menghasilkan 84?",
    lesson: "Indeks list Python dimulai dari 0. Elemen pertama berindeks 0, elemen ketiga berindeks 2.",
    hint: "Hitung posisi mulai dari nol.",
    options: ["nilai[1]", "nilai[2]", "nilai[3]", "nilai[84]"],
    answer: 1,
    explanation: "Angka 84 adalah elemen ketiga, sehingga indeksnya 2."
  },
  {
    id: "xi-06",
    number: 6,
    grade: 11,
    world: "Kepulauan Data",
    icon: "ƒ",
    title: "Fungsi Penyaring",
    subtitle: "Pisahkan logika menjadi fungsi",
    concept: "Fungsi & list",
    type: "code",
    xp: 140,
    prompt: "Lengkapi fungsi lulus(data) agar mengembalikan list berisi nilai minimal 75, tanpa mengubah urutannya.",
    lesson: "Fungsi membuat logika dapat dipakai kembali. Kita bisa mengumpulkan data yang lolos kondisi ke list hasil.",
    hint: "Buat list kosong, lakukan loop, append nilai jika nilai >= 75, lalu return hasil.",
    starter: "def lulus(data):\n    hasil = []\n    # Lengkapi logika penyaringan\n    return hasil\n\nprint(lulus([60, 75, 88, 72, 91]))\n",
    checks: [
      { label: "Menyaring data campuran", expression: "lulus([60, 75, 88, 72, 91])", expected: [75, 88, 91] },
      { label: "Menangani list kosong", expression: "lulus([])", expected: [] },
      { label: "Mempertahankan nilai batas 75", expression: "lulus([75, 74])", expected: [75] }
    ]
  },
  {
    id: "xi-07",
    number: 7,
    grade: 11,
    world: "Kepulauan Data",
    icon: "{ }",
    title: "Arsip Dictionary",
    subtitle: "Hubungkan kunci dan nilai",
    concept: "Dictionary",
    type: "arrange",
    xp: 130,
    prompt: "Susun program untuk membuat profil siswa, menambah nilai Python, lalu mencetaknya.",
    lesson: "Dictionary menyimpan pasangan kunci–nilai. Nilai dapat dibaca atau diubah melalui nama kuncinya.",
    hint: "Buat dictionary lebih dulu, tambahkan kunci baru, kemudian cetak nilai tersebut.",
    blocks: [
      "siswa = {\"nama\": \"Naya\", \"kelas\": 11}",
      "siswa[\"nilai_python\"] = 93",
      "print(siswa[\"nilai_python\"])"
    ]
  },
  {
    id: "xi-08",
    number: 8,
    grade: 11,
    world: "Kepulauan Data",
    icon: "⚠",
    title: "Anomali Rata-rata",
    subtitle: "Temukan dan perbaiki bug",
    concept: "Debugging",
    type: "debug",
    xp: 150,
    prompt: "Program berikut seharusnya menghitung rata-rata sebuah list. Temukan bug-nya dan perbaiki agar semua pengujian lolos.",
    lesson: "Debugging dilakukan dengan memahami keluaran yang diharapkan, membaca alur kode, lalu menguji perbaikan pada beberapa kasus.",
    hint: "Rata-rata adalah jumlah seluruh nilai dibagi banyaknya nilai, bukan dibagi jumlahnya lagi.",
    starter: "def rata_rata(data):\n    total = sum(data)\n    return total / total  # BUG ada di baris ini\n\nprint(rata_rata([80, 90, 100]))\n",
    checks: [
      { label: "Rata-rata 80, 90, 100", expression: "rata_rata([80, 90, 100])", expected: 90 },
      { label: "Rata-rata dua angka", expression: "rata_rata([10, 20])", expected: 15 },
      { label: "Rata-rata satu angka", expression: "rata_rata([7])", expected: 7 }
    ]
  },
  {
    id: "xii-09",
    number: 9,
    grade: 12,
    world: "Benteng Rekayasa",
    icon: "⬡",
    title: "Blueprint Objek",
    subtitle: "Pahami class dan instance",
    concept: "OOP",
    type: "quiz",
    xp: 130,
    prompt: "Dalam pemrograman berorientasi objek, pernyataan manakah yang paling tepat?",
    lesson: "Class adalah rancangan yang mendefinisikan data dan perilaku. Object atau instance adalah wujud spesifik yang dibuat dari class.",
    hint: "Bayangkan class sebagai cetak biru dan object sebagai bangunan yang dibuat darinya.",
    options: [
      "Class adalah nilai tunggal, object adalah tipe data",
      "Class adalah cetak biru, object adalah instance yang dibuat darinya",
      "Class hanya boleh memiliki satu object",
      "Object tidak dapat menyimpan atribut"
    ],
    answer: 1,
    explanation: "Class mendeskripsikan atribut dan metode; setiap object memiliki keadaan konkretnya sendiri."
  },
  {
    id: "xii-10",
    number: 10,
    grade: 12,
    world: "Benteng Rekayasa",
    icon: "C",
    title: "Droid Akademi",
    subtitle: "Bangun class dengan metode",
    concept: "Class & method",
    type: "code",
    xp: 170,
    prompt: "Lengkapi class Robot. Constructor menerima nama dan energi. Metode isi(daya) menambah energi, tetapi tidak boleh melewati 100, lalu mengembalikan energi terbaru.",
    lesson: "Constructor __init__ menyiapkan atribut object. Metode mengubah atau membaca keadaan object melalui self.",
    hint: "Gunakan min(100, self.energi + daya), lalu return self.energi.",
    starter: "class Robot:\n    def __init__(self, nama, energi):\n        # Simpan kedua parameter sebagai atribut\n        pass\n\n    def isi(self, daya):\n        # Tambahkan energi, maksimum 100\n        pass\n\nr = Robot(\"Piko\", 72)\nprint(r.isi(35))\n",
    checks: [
      { label: "Nama tersimpan sebagai atribut", expression: "Robot('Piko', 72).nama", expected: "Piko" },
      { label: "Energi dibatasi maksimum 100", expression: "Robot('Piko', 72).isi(35)", expected: 100 },
      { label: "Penambahan normal bekerja", expression: "Robot('Piko', 20).isi(15)", expected: 35 }
    ]
  },
  {
    id: "xii-11",
    number: 11,
    grade: 12,
    world: "Benteng Rekayasa",
    icon: "⇢",
    title: "Pipeline Data",
    subtitle: "Rancang alur transformasi",
    concept: "Dekomposisi",
    type: "arrange",
    xp: 150,
    prompt: "Susun pipeline yang membersihkan data kosong, mengubah teks angka menjadi integer, lalu menghitung rata-rata.",
    lesson: "Pipeline memecah proses besar menjadi transformasi kecil yang terurut. Setiap tahap memakai hasil tahap sebelumnya.",
    hint: "Bersihkan sebelum konversi; konversi sebelum perhitungan.",
    blocks: [
      "data_mentah = [\"80\", \"\", \"95\", \"75\"]",
      "data_bersih = [x for x in data_mentah if x != \"\"]",
      "angka = [int(x) for x in data_bersih]",
      "rata = sum(angka) / len(angka)",
      "print(rata)"
    ]
  },
  {
    id: "xii-12",
    number: 12,
    grade: 12,
    world: "Benteng Rekayasa",
    icon: "★",
    title: "Inti Pythonia",
    subtitle: "Final: analisis data sensor",
    concept: "Proyek mini",
    type: "code",
    xp: 220,
    prompt: "Buat fungsi ringkas(data) yang menerima list angka dan mengembalikan dictionary dengan kunci minimum, maksimum, rata_rata (dibulatkan 2 desimal), dan di_atas_rata (jumlah nilai yang lebih besar dari rata-rata).",
    lesson: "Proyek akhir memadukan fungsi, list, dictionary, percabangan, dan agregasi menjadi satu solusi yang dapat diuji.",
    hint: "Hitung rata-rata sekali, lalu gunakan sum(1 for nilai in data if nilai > rata).",
    starter: "def ringkas(data):\n    # Kembalikan dictionary ringkasan data\n    pass\n\nsensor = [72, 88, 91, 69, 95]\nprint(ringkas(sensor))\n",
    checks: [
      { label: "Ringkasan data sensor", expression: "ringkas([72, 88, 91, 69, 95])", expected: { minimum: 69, maksimum: 95, rata_rata: 83, di_atas_rata: 3 } },
      { label: "Pembulatan dua desimal", expression: "ringkas([1, 2, 2])", expected: { minimum: 1, maksimum: 2, rata_rata: 1.67, di_atas_rata: 2 } },
      { label: "Data seragam", expression: "ringkas([5, 5, 5])", expected: { minimum: 5, maksimum: 5, rata_rata: 5, di_atas_rata: 0 } }
    ]
  }
];

export const gradeMeta = {
  10: { roman: "X", name: "Pulau Logika", theme: "cyan", focus: "Fondasi Python" },
  11: { roman: "XI", name: "Kepulauan Data", theme: "violet", focus: "Struktur Data" },
  12: { roman: "XII", name: "Benteng Rekayasa", theme: "amber", focus: "Rekayasa Program" }
};

export const typeLabels = {
  quiz: "Kuis konsep",
  arrange: "Susun kode",
  code: "Praktik kode",
  debug: "Debugging"
};
