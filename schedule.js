const PLANNER_VERSION = 2;
const STORAGE_KEY = 'edux_task_planner_v2';
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const BLOCKS = [
  { id: 'morning', label: 'Sabah', window: '08:00 - 12:00', description: 'Yeni konu, net zihin isteyen işler ve ilk odak bloğu.' },
  { id: 'afternoon', label: 'Öğle', window: '12:00 - 17:00', description: 'Soru çözümü, branş denemesi ve hız çalışmaları.' },
  { id: 'evening', label: 'Akşam', window: '17:00 - 23:00', description: 'Tekrar, analiz, kapanış ve telafi görevleri.' },
];
const STATUS_ORDER = ['todo', 'partial', 'done'];
const STATUS_META = {
  todo: { label: 'Yapılmadı', short: 'Gri', emoji: '⚪' },
  partial: { label: 'Yarım Kaldı', short: 'Sarı', emoji: '🟡' },
  done: { label: 'Tamamlandı', short: 'Yeşil', emoji: '🟢' },
};
const ACTIVITY_TYPES = {
  topic: {
    label: 'Konu Çalışması',
    description: 'İlk öğrenme veya eksik kapatma',
    icon: '📖',
    defaultGoalType: 'duration',
  },
  practice: {
    label: 'Soru Çözümü',
    description: 'Pratik ve soru seti',
    icon: '📝',
    defaultGoalType: 'questions',
  },
  exam: {
    label: 'Deneme Sınavı',
    description: 'Genel veya branş denemesi',
    icon: '🎯',
    defaultGoalType: 'exams',
  },
  review: {
    label: 'Tekrar',
    description: 'Unutmayı engelleyen pekiştirme',
    icon: '🔄',
    defaultGoalType: 'duration',
  },
};
const GOAL_TYPE_LABELS = {
  duration: 'Saat',
  questions: 'Soru',
  exams: 'Deneme',
};
const CURRICULUM = {
  TYT: [
    {
      name: 'Matematik',
      type: 'math',
      topics: [
        'Temel Kavramlar', 'Sayı Basamakları', 'Bölme ve Bölünebilme', 'EBOB - EKOK',
        'Rasyonel Sayılar', 'Ondalık Sayılar', 'Basit Eşitsizlikler', 'Mutlak Değer',
        'Üslü İfadeler', 'Köklü İfadeler', 'Çarpanlara Ayırma', 'Oran - Orantı',
        'Denklem Çözme', 'Problemler - Sayı', 'Problemler - Kesir', 'Problemler - Yaş',
        'Problemler - İşçi-Havuz', 'Problemler - Hareket', 'Problemler - Kar-Zarar-Yüzde',
        'Problemler - Karışım', 'Kümeler', 'Fonksiyonlar', 'Permütasyon - Kombinasyon',
        'Olasılık', 'İstatistik (Veri)', 'Polinomlar (TYT)', 'Mantık',
      ],
    },
    {
      name: 'Türkçe',
      type: 'language',
      topics: [
        'Sözcükte Anlam', 'Sözcükler Arası Anlam İlişkileri', 'Söz Sanatları',
        'Cümlede Anlam', 'Paragraf - Ana Düşünce', 'Paragraf - Yardımcı Düşünce',
        'Paragraf - Yapı', 'Paragraf - Anlatım Teknikleri', 'Ses Bilgisi',
        'Yazım Kuralları', 'Noktalama İşaretleri', 'İsimler (Adlar)',
        'Sıfatlar', 'Zamirler', 'Zarflar', 'Edatlar-Bağlaçlar-Ünlemler',
        'Fiiller', 'Fiilde Çatı', 'Fiilimsi', 'Ek Fiil',
        'Cümlenin Öğeleri', 'Cümle Türleri', 'Anlatım Bozukluğu',
      ],
    },
    {
      name: 'Geometri',
      type: 'math',
      topics: [
        'Doğruda Açılar', 'Üçgende Açılar', 'Üçgende Alan',
        'Üçgende Eşlik ve Benzerlik', 'Üçgende Kenarortay-Açıortay-Yükseklik',
        'İkizkenar ve Eşkenar Üçgen', 'Dik Üçgen ve Pisagor',
        'Dörtgenler - Genel', 'Paralelkenar', 'Dikdörtgen ve Kare',
        'Eşkenar Dörtgen', 'Yamuk', 'Deltoid',
        'Çokgenler', 'Çember - Temel', 'Çemberde Açı',
        'Çemberde Uzunluk ve Alan', 'Daire ve Dilim', 'Katı Cisimler',
        'Prizmalar', 'Silindir-Koni-Küre', 'Analitik Geometri - Nokta ve Doğru',
      ],
    },
    {
      name: 'Fizik',
      type: 'science',
      topics: [
        'Fizik Bilimine Giriş', 'Madde ve Özellikleri', 'Sıvıların Kaldırma Kuvveti',
        'Hareket ve Hız', 'Kuvvet ve Newton Yasaları', 'Sürtünme Kuvveti',
        'İş - Güç - Enerji', 'Isı ve Sıcaklık', 'Genleşme',
        'Hal Değişimi', 'Basınç', 'Açık Hava Basıncı',
        'Kapalı Kap Basıncı', 'Dalgalar', 'Ses Dalgaları',
        'Aydınlanma ve Gölge', 'Düzlem Ayna', 'Küresel Ayna',
        'Işığın Kırılması', 'Elektrik Yükleri', 'Elektrik Alan ve Potansiyel',
        'Elektrik Akımı', 'Direnç ve Ohm Yasası', 'Manyetizma',
      ],
    },
    {
      name: 'Kimya',
      type: 'science',
      topics: [
        'Kimya Bilimi', 'Atom Modelleri', 'Periyodik Sistem',
        'Elektron Dizilimi', 'Kimyasal Türler Arası Etkileşimler',
        'İyonik ve Kovalent Bağ', 'Metalik Bağ', 'Lewis Formülleri',
        'Mol Kavramı', 'Kimyasal Tepkime Denklemleri', 'Tepkime Türleri',
        'Karışımlar', 'Homojen Karışımlar (Çözeltiler)', 'Heterojen Karışımlar',
        'Ayırma Yöntemleri', 'Asitler ve Bazlar', 'Tuzlar',
        'Kimya Her Yerde', 'Endüstride Kimya',
      ],
    },
    {
      name: 'Biyoloji',
      type: 'science',
      topics: [
        'Canlıların Ortak Özellikleri', 'Canlıların Yapısında Bulunan Temel Bileşikler',
        'Hücre Organelleri', 'Hücre Zarından Madde Geçişleri',
        'Canlıların Sınıflandırılması', 'Mitoz Bölünme', 'Mayoz Bölünme',
        'Eşeysiz Üreme', 'Eşeyli Üreme', 'Mendel Genetiği',
        'Kalıtım (Kan Grupları, Eş Baskınlık)', 'DNA ve RNA',
        'Fotosentez', 'Kemosentez', 'Oksijenli Solunum',
        'Fermantasyon', 'Ekosistem', 'Madde Döngüleri',
        'Çevre Sorunları ve İnsan', 'İnsan Fizyolojisine Giriş', 'Sindirim Sistemi',
        'Dolaşım Sistemi', 'Solunum Sistemi', 'Boşaltım Sistemi',
      ],
    },
    {
      name: 'Tarih',
      type: 'social',
      topics: [
        'Tarih Bilimi ve Kaynaklar', 'Tarihin Sınıflandırılması',
        'İlk Çağ Uygarlıkları', 'Uygarlığın Doğuşu (Mezopotamya, Mısır)',
        'İslamiyet Öncesi Türk Tarihi', 'Hunlar ve Göktürkler',
        'Uygurlar', 'İslamiyetin Doğuşu', 'İlk Türk İslam Devletleri',
        'Selçuklular', 'Anadolu Selçuklu Devleti', 'Beylikler Dönemi',
        'Osmanlı Kuruluş Dönemi', 'Osmanlı Yükselme Dönemi',
        'Osmanlı Duraklama Dönemi', 'I. Dünya Savaşı', 'Kurtuluş Savaşı',
        'Atatürk İlke ve İnkılapları',
      ],
    },
    {
      name: 'Coğrafya',
      type: 'social',
      topics: [
        'Doğa ve İnsan', 'Dünya\'nın Şekli ve Hareketleri',
        'Koordinat Sistemi', 'Harita Bilgisi', 'İklim Bilgisi',
        'Basınç ve Rüzgarlar', 'Nem ve Yağış', 'İklim Tipleri',
        'İç Kuvvetler (Deprem, Volkanizma)', 'Dış Kuvvetler (Akarsu, Rüzgar, Buzul)',
        'Türkiye\'nin Yer Şekilleri', 'Türkiye\'nin İklimi',
        'Türkiye\'nin Su Kaynakları', 'Nüfus ve Yerleşme',
        'Türkiye\'de Nüfus', 'Göç', 'Bölgeler ve Ülkeler',
        'Doğal Afetler',
      ],
    },
    {
      name: 'Felsefe',
      type: 'social',
      topics: [
        'Felsefeyi Tanıma', 'Felsefe ve Bilim İlişkisi', 'Bilgi Felsefesi',
        'Doğruluk ve Gerçeklik', 'Varlık Felsefesi', 'Ahlak Felsefesi',
        'Siyaset Felsefesi', 'Sanat Felsefesi', 'Din Felsefesi',
      ],
    },
    {
      name: 'Din Kültürü',
      type: 'social',
      topics: [
        'Bilgi ve İnanç', 'İslam\'da İbadet', 'Namaz - Oruç - Zekat - Hac',
        'Ahlak ve Değerler', 'Hz. Muhammed\'in Hayatı',
        'Kur\'an ve Sünnet', 'Vahiy ve Akıl', 'İslam Düşüncesinde Yorumlar',
      ],
    },
  ],
  AYT: [
    {
      name: 'Matematik',
      type: 'math',
      topics: [
        'Fonksiyonlar (İleri)', 'Fonksiyon Grafikleri', 'Polinomlar',
        'Polinom Bölme ve Çarpanlara Ayırma', 'İkinci Dereceden Denklemler',
        'İkinci Dereceden Eşitsizlikler', 'Parabol', 'Trigonometri - Temel',
        'Trigonometrik Fonksiyonlar', 'Trigonometrik Denklemler',
        'Toplam-Fark ve Yarım Açı Formülleri', 'Karmaşık Sayılar',
        'Logaritma', 'Üstel ve Logaritmik Fonksiyonlar',
        'Diziler', 'Aritmetik ve Geometrik Dizi', 'Seriler',
        'Limit', 'Süreklilik', 'Türev - Tanım ve Kurallar',
        'Türev Uygulamaları', 'Maksimum-Minimum Problemleri',
        'İntegral - Belirsiz', 'İntegral - Belirli', 'Alan ve Hacim Hesabı',
      ],
    },
    {
      name: 'Geometri',
      type: 'math',
      topics: [
        'Doğrunun Analitiği', 'İki Doğrunun Birbirine Göre Durumu',
        'Dönüşüm Geometrisi', 'Öteleme-Yansıma-Dönme',
        'Çemberin Analitiği', 'Çember ve Doğrunun İlişkisi',
        'Katı Cisimler (İleri)', 'Prizma Hacim ve Alan',
        'Silindir-Koni-Küre Hacim ve Alan',
        'Vektörler', 'Vektörlerde İşlemler',
        'Çokgenlerde Alan (İleri)', 'Koordinat Düzleminde Alan',
      ],
    },
    {
      name: 'Fizik',
      type: 'science',
      topics: [
        'Vektörler', 'Bileşke Kuvvet', 'Kuvvet Tork Denge',
        'Kütle Merkezi', 'Basit Makineler',
        'Elektriksel Kuvvet ve Coulomb Yasası', 'Elektrik Alan',
        'Elektrik Potansiyel ve Enerji', 'Kondansatörler',
        'Manyetizma', 'Manyetik Alan', 'İndüksiyon',
        'Alternatif Akım ve Transformatör',
        'Düzgün Çembersel Hareket', 'Basit Harmonik Hareket',
        'Dalga Mekaniği', 'Elektromanyetik Dalgalar',
        'Modern Fizik', 'Özel Görelilik', 'Fotoelektrik Olay',
        'Compton Olayı', 'De Broglie Dalga Boyu',
        'Atom Fiziği', 'Radyoaktivite', 'Nükleer Fizik',
      ],
    },
    {
      name: 'Kimya',
      type: 'science',
      topics: [
        'Modern Atom Teorisi', 'Kuantum Sayıları', 'Periyodik Özellikler',
        'Gazlar - Temel', 'Gaz Yasaları', 'İdeal Gaz Denklemi',
        'Sıvı Çözeltiler', 'Derişim Birimleri', 'Koligatif Özellikler',
        'Kimyasal Tepkimelerde Enerji', 'Hess Yasası',
        'Tepkime Hızları', 'Hız Denklemi',
        'Kimyasal Denge', 'Denge Sabiti', 'Le Chatelier İlkesi',
        'Asit-Baz Dengesi', 'pH ve pOH', 'Tampon Çözeltiler',
        'Çözünürlük Dengesi', 'Çözünürlük Çarpımı',
        'Elektrokimya', 'Pil ve Elektroliz',
        'Organik Kimya - Giriş', 'Hidrokarbonlar', 'Fonksiyonel Gruplar',
        'Organik Tepkimeler',
      ],
    },
    {
      name: 'Biyoloji',
      type: 'science',
      topics: [
        'Sinir Sistemi', 'Merkezi ve Çevresel Sinir Sistemi',
        'Endokrin Sistem', 'Hormonlar', 'Duyu Organları',
        'Göz ve Görme', 'Kulak ve İşitme',
        'Destek ve Hareket Sistemi', 'Kas ve İskelet',
        'Sindirim Sistemi', 'Sindirim Enzimleri',
        'Dolaşım Sistemi', 'Kalp ve Kan Damarları', 'Kan',
        'Bağışıklık Sistemi', 'Solunum Sistemi',
        'Boşaltım Sistemi', 'Böbrekler',
        'Üreme Sistemi', 'Embriyonik Gelişim',
        'Bitki Biyolojisi', 'Bitkilerde Taşıma',
        'Komünite ve Popülasyon Ekolojisi',
      ],
    },
    {
      name: 'Edebiyat',
      type: 'language',
      topics: [
        'Şiir Bilgisi', 'Şiir Türleri ve Nazım Biçimleri',
        'İslamiyet Öncesi Türk Edebiyatı', 'Geçiş Dönemi',
        'Halk Edebiyatı - Anonim', 'Halk Edebiyatı - Aşık Tarzı',
        'Halk Edebiyatı - Tekke-Tasavvuf',
        'Divan Edebiyatı', 'Divan Şiiri Nazım Biçimleri',
        'Tanzimat Edebiyatı I. Dönem', 'Tanzimat Edebiyatı II. Dönem',
        'Servetifünun Edebiyatı', 'Fecriati Edebiyatı',
        'Milli Edebiyat', 'Cumhuriyet Dönemi - Şiir',
        'Cumhuriyet Dönemi - Roman', 'Cumhuriyet Dönemi - Hikaye',
      ],
    },
    {
      name: 'Tarih-1',
      type: 'social',
      topics: [
        'Türklerde Devlet Teşkilatı', 'Türk-İslam Devletlerinde Kültür',
        'Osmanlı Siyasi Tarihi (Kuruluş-Yükselme)',
        'Osmanlı Devlet Yönetimi', '17. Yüzyıl Islahatları',
        '18. Yüzyıl Islahatları', '19. Yüzyılda Değişim', 'Tanzimat ve Meşrutiyet',
        'Osmanlı Ekonomisi', 'Milli Mücadele', 'Atatürkçülük',
      ],
    },
    {
      name: 'Coğrafya-1',
      type: 'social',
      topics: [
        'Doğal Sistemler', 'Jeomorfoloji', 'Hidrografya',
        'Beşeri Sistemler', 'Ekonomik Faaliyetler', 'Küresel Ortam',
        'Türkiye Ekonomisi', 'Tarım-Hayvancılık-Madencilik',
        'Sanayi ve Enerji', 'Ulaşım ve Ticaret', 'Bölgeler ve Ülkeler',
      ],
    },
    {
      name: 'Tarih-2',
      type: 'social',
      topics: [
        '20. Yüzyıl Başlarında Dünya', 'I. Dünya Savaşı (Detay)',
        'II. Dünya Savaşı', 'Soğuk Savaş Dönemi',
        'Yumuşama Dönemi', 'Sovyetlerin Çöküşü',
        'Küreselleşme', 'Türk Dış Politikası',
        'Çağdaş Türk ve Dünya Tarihi',
      ],
    },
    {
      name: 'Coğrafya-2',
      type: 'social',
      topics: [
        'Ekosistem ve Madde Döngüsü', 'Biyoçeşitlilik', 'Biyomlar',
        'Nüfus Politikaları', 'Şehirleşme ve Sorunları',
        'Ulaşım Ağları', 'Ticaret', 'Enerji Kaynakları',
        'Çevre ve Toplum', 'Doğal Kaynak Yönetimi',
      ],
    },
    {
      name: 'Felsefe Grubu',
      type: 'social',
      topics: [
        'Psikolojiye Giriş', 'Öğrenme ve Bellek', 'Algı ve Dikkat',
        'Kişilik Kuramları', 'Sosyolojiye Giriş', 'Toplumsal Yapı',
        'Toplumsal Değişme', 'Mantık - Önermeler', 'Mantık - Çıkarımlar',
        'Felsefe Problemleri ve Akımlar',
      ],
    },
    {
      name: 'Din Kültürü',
      type: 'social',
      topics: [
        'Kur\'an\'a Göre Hz. Muhammed', 'İnanç Esasları',
        'İslam ve Bilim', 'Anadolu\'da İslam', 'İslam Medeniyeti',
      ],
    },
  ],
  YDT: [
    {
      name: 'İngilizce - Dil Bilgisi',
      type: 'language',
      topics: [
        'Tenses (Zamanlar)', 'Present Simple & Continuous', 'Past Simple & Continuous',
        'Present Perfect & Past Perfect', 'Future Tenses (Will, Going to)',
        'Modals (Can, Could, May, Must, Should)', 'Passive Voice (Edilgen Çatı)',
        'Reported Speech (Dolaylı Anlatım)', 'Conditionals (Koşul Cümleleri)',
        'Relative Clauses (İlgi Cümleleri)', 'Gerunds & Infinitives',
        'Conjunctions (Bağlaçlar)', 'Prepositions (Edatlar)',
        'Articles (a, an, the)', 'Quantifiers (Some, Any, Much, Many)',
        'Comparatives & Superlatives', 'Causatives (Have/Get something done)',
        'Subject-Verb Agreement', 'Noun Clauses', 'Adverbial Clauses',
        'Inversion', 'Cleft Sentences', 'Wish Clauses',
      ],
    },
    {
      name: 'İngilizce - Kelime Bilgisi',
      type: 'language',
      topics: [
        'Synonyms & Antonyms', 'Word Formation (Sözcük Türetme)',
        'Prefixes & Suffixes', 'Phrasal Verbs', 'Idioms & Expressions',
        'Collocations', 'Confusing Words', 'Academic Vocabulary',
        'Contextual Meaning (Bağlamdan Anlam)', 'Word Families',
      ],
    },
    {
      name: 'İngilizce - Okuma',
      type: 'language',
      topics: [
        'Reading Comprehension', 'Main Idea & Supporting Details',
        'Inference (Çıkarım)', 'Paragraph Completion',
        'Cloze Test', 'Dialogue Completion', 'Sentence Completion',
        'Irrelevant Sentence (Anlam Bütünlüğünü Bozan Cümle)',
        'Paragraph Ordering', 'Translation (Çeviri)',
        'Close Meaning (Yakın Anlam)',
      ],
    },
  ],
};
const TEMPLATE_LIBRARY = [
  {
    id: 'ea-baslangic',
    title: 'Sıfırdan Başlayan Eşit Ağırlıkçı',
    audience: 'ea',
    hours: 18,
    tags: ['EA', 'Yeni Başlayan', 'Dengeli'],
    description: 'Temel TYT ağırlığını korurken AYT Edebiyat ve Matematikle ritim kuran hafif ama sürdürülebilir başlangıç haftası.',
    slots: [
      { dayIndex: 0, block: 'morning', track: 'TYT', subject: 'Matematik', topic: 'Temel Kavramlar', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 0, block: 'evening', track: 'TYT', subject: 'Türkçe', topic: 'Paragraf', activityType: 'practice', goalType: 'questions', goalValue: 40 },
      { dayIndex: 1, block: 'afternoon', track: 'AYT', subject: 'Edebiyat', topic: 'Şiir Bilgisi', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 2, block: 'morning', track: 'TYT', subject: 'Geometri', topic: 'Üçgenler', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 2, block: 'evening', track: 'AYT', subject: 'Matematik', topic: 'Fonksiyonlar', activityType: 'practice', goalType: 'questions', goalValue: 35 },
      { dayIndex: 4, block: 'afternoon', track: 'TYT', subject: 'Tarih', topic: 'Kurtuluş Savaşı', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 5, block: 'morning', track: 'TYT', subject: 'Matematik', topic: 'Problemler', activityType: 'practice', goalType: 'questions', goalValue: 50 },
      { dayIndex: 6, block: 'evening', track: 'TYT', subject: 'Genel Deneme', topic: 'TYT Mini Deneme', activityType: 'exam', goalType: 'exams', goalValue: 1 },
    ],
  },
  {
    id: 'say-mezun',
    title: 'Mezuna Kalan Sayısalcı',
    audience: 'say',
    hours: 30,
    tags: ['SAY', 'Mezun', 'Yoğun'],
    description: 'AYT fen ve matematik yükünü yüksek tutarken haftaya yayılmış TYT soru disiplini ve deneme ritmi kurar.',
    slots: [
      { dayIndex: 0, block: 'morning', track: 'AYT', subject: 'Matematik', topic: 'Türev', activityType: 'topic', goalType: 'duration', goalValue: 3 },
      { dayIndex: 0, block: 'afternoon', track: 'AYT', subject: 'Fizik', topic: 'Manyetizma', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 1, block: 'morning', track: 'TYT', subject: 'Türkçe', topic: 'Paragraf', activityType: 'practice', goalType: 'questions', goalValue: 60 },
      { dayIndex: 1, block: 'evening', track: 'AYT', subject: 'Kimya', topic: 'Organik Kimya', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 2, block: 'morning', track: 'AYT', subject: 'Biyoloji', topic: 'Sinir Sistemi', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 2, block: 'afternoon', track: 'AYT', subject: 'Matematik', topic: 'İntegral', activityType: 'practice', goalType: 'questions', goalValue: 45 },
      { dayIndex: 3, block: 'evening', track: 'TYT', subject: 'Geometri', topic: 'Çember ve Daire', activityType: 'practice', goalType: 'questions', goalValue: 30 },
      { dayIndex: 4, block: 'morning', track: 'AYT', subject: 'Fizik', topic: 'Modern Fizik', activityType: 'practice', goalType: 'questions', goalValue: 35 },
      { dayIndex: 4, block: 'afternoon', track: 'AYT', subject: 'Kimya', topic: 'Kimyasal Denge', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 5, block: 'morning', track: 'TYT', subject: 'Genel Deneme', topic: 'TYT Genel Deneme', activityType: 'exam', goalType: 'exams', goalValue: 1 },
      { dayIndex: 6, block: 'afternoon', track: 'AYT', subject: 'Genel Deneme', topic: 'AYT Branş Denemesi', activityType: 'exam', goalType: 'exams', goalValue: 1 },
    ],
  },
  {
    id: 'tyt-son3ay',
    title: 'Son 3 Ay TYT Kampı',
    audience: 'tyt',
    hours: 24,
    tags: ['TYT', 'Kamp', 'Net Artışı'],
    description: 'TYT netlerini kısa sürede yukarı taşımak için paragraf, problem, geometri ve fen tekrarını birlikte döndürür.',
    slots: [
      { dayIndex: 0, block: 'morning', track: 'TYT', subject: 'Türkçe', topic: 'Paragraf', activityType: 'practice', goalType: 'questions', goalValue: 50 },
      { dayIndex: 0, block: 'evening', track: 'TYT', subject: 'Matematik', topic: 'Problemler', activityType: 'practice', goalType: 'questions', goalValue: 45 },
      { dayIndex: 1, block: 'afternoon', track: 'TYT', subject: 'Geometri', topic: 'Üçgenler', activityType: 'topic', goalType: 'duration', goalValue: 2 },
      { dayIndex: 2, block: 'morning', track: 'TYT', subject: 'Fizik', topic: 'Basınç', activityType: 'topic', goalType: 'duration', goalValue: 1 },
      { dayIndex: 2, block: 'evening', track: 'TYT', subject: 'Kimya', topic: 'Mol Kavramı', activityType: 'practice', goalType: 'questions', goalValue: 25 },
      { dayIndex: 3, block: 'afternoon', track: 'TYT', subject: 'Biyoloji', topic: 'Hücre', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 4, block: 'morning', track: 'TYT', subject: 'Matematik', topic: 'Temel Kavramlar', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 5, block: 'morning', track: 'TYT', subject: 'Genel Deneme', topic: 'TYT Tam Deneme', activityType: 'exam', goalType: 'exams', goalValue: 1 },
      { dayIndex: 6, block: 'evening', track: 'TYT', subject: 'Türkçe', topic: 'Anlatım Bozukluğu', activityType: 'review', goalType: 'duration', goalValue: 1 },
    ],
  },
  {
    id: 'denge-tekrar',
    title: 'Denge + Telafi Haftası',
    audience: 'balanced',
    hours: 16,
    tags: ['Telafi', 'Tekrar', 'Dengeli'],
    description: 'Eksik havuzunu eritmek, tamamlanmış konuları unutmamak ve haftayı daha sakin ama kontrollü geçirmek için.',
    slots: [
      { dayIndex: 0, block: 'evening', track: 'TYT', subject: 'Matematik', topic: 'Mutlak Değer', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 1, block: 'morning', track: 'TYT', subject: 'Türkçe', topic: 'Sözcükte Anlam', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 2, block: 'afternoon', track: 'AYT', subject: 'Matematik', topic: 'Logaritma', activityType: 'practice', goalType: 'questions', goalValue: 25 },
      { dayIndex: 3, block: 'evening', track: 'AYT', subject: 'Fizik', topic: 'Dalga Mekaniği', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 4, block: 'afternoon', track: 'TYT', subject: 'Coğrafya', topic: 'Harita Bilgisi', activityType: 'review', goalType: 'duration', goalValue: 1 },
      { dayIndex: 5, block: 'morning', track: 'TYT', subject: 'Genel Deneme', topic: 'Branş Denemesi Paketi', activityType: 'exam', goalType: 'exams', goalValue: 1 },
      { dayIndex: 6, block: 'evening', track: 'AYT', subject: 'Edebiyat', topic: 'Cumhuriyet Dönemi', activityType: 'review', goalType: 'duration', goalValue: 1 },
    ],
  },
];

const dom = {};
const state = {
  currentUser: null,
  userLevel: '',
  userTrack: 'mixed',
  isHighSchoolCategory: true,
  tasks: [],
  meta: {
    version: PLANNER_VERSION,
    hasStarted: false,
    weekOffset: 0,
    lastCarryoverRun: null,
    aiCoachNote: '',
    showAllSubjects: false,
  },
  templateFilter: 'all',
  dragTaskId: null,
  saveTimer: null,
};

document.addEventListener('DOMContentLoaded', initPlanner);

function initPlanner() {
  cacheDom();
  injectPlannerModals();
  bindStaticEvents();

  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(async (user) => {
      state.currentUser = user || null;
      await hydratePlanner();
    });
  } else {
    hydratePlanner();
  }
}

function cacheDom() {
  dom.bodyArea = document.getElementById('bodyArea');
  dom.scheduleEmpty = document.getElementById('scheduleEmpty');
  dom.plannerInitialLoader = document.getElementById('plannerInitialLoader');
  dom.plannerShell = document.getElementById('plannerShell');
  dom.analyzeBtn = document.getElementById('analyzeBtn');
  dom.prevWeekBtn = document.getElementById('prevWeekBtn');
  dom.nextWeekBtn = document.getElementById('nextWeekBtn');
  dom.currentWeekBtn = document.getElementById('currentWeekBtn');
  dom.weekLabel = document.getElementById('weekLabel');
  dom.btnCreateBlank = document.getElementById('btnCreateBlank');
  dom.btnSelectTemplate = document.getElementById('btnSelectTemplate');
  dom.btnAiPlan = document.getElementById('btnAiPlan');
  dom.plannerSummary = document.getElementById('plannerSummary');
  dom.coachInsights = document.getElementById('coachInsights');
  dom.weekProgressCard = document.getElementById('weekProgressCard');
  dom.carryoverList = document.getElementById('carryoverList');
  dom.plannerBoard = document.getElementById('plannerBoard');
  dom.subjectProgressGrid = document.getElementById('subjectProgressGrid');
  dom.trackPreferenceSelect = document.getElementById('trackPreferenceSelect');
  dom.toggleAllSubjectsBtn = document.getElementById('toggleAllSubjectsBtn');
  dom.drawerOverlay = document.getElementById('drawerOverlay');
  dom.templateDrawer = document.getElementById('templateDrawer');
  dom.templateFilters = document.getElementById('templateFilters');
  dom.templateList = document.getElementById('templateList');
  dom.closeTemplateDrawer = document.getElementById('closeTemplateDrawer');
  dom.analyzeDrawer = document.getElementById('analyzeDrawer');
  dom.analyzeContent = document.getElementById('analyzeContent');
  dom.closeAnalyzeDrawer = document.getElementById('closeAnalyzeDrawer');
}

function injectPlannerModals() {
  const modalsHtml = `
    <div class="auth-modal" id="taskModal">
      <div class="auth-modal-overlay" data-close-modal="taskModal"></div>
      <div class="auth-modal-card auth-modal-card--wide">
        <button class="auth-modal-x" data-close-modal="taskModal">×</button>
        <div class="auth-modal-header">
          <div class="auth-modal-logo">🧩</div>
          <div>
            <h2 id="taskModalTitle">Yeni Görev</h2>
            <p id="taskModalSubtitle">Zaman bloğunu dolduran işi belirle; saat değil hedef tanımla.</p>
          </div>
        </div>
        <form id="taskForm">
          <input type="hidden" id="taskIdInput" />
          <input type="hidden" id="taskActivityTypeInput" value="topic" />
          <div class="planner-form-grid">
            <div class="planner-form-group full">
              <label>Ne yapacaksın?</label>
              <div class="choice-grid" id="activityChoices">
                ${Object.entries(ACTIVITY_TYPES).map(([key, item]) => `
                  <button class="choice-btn ${key === 'topic' ? 'active' : ''}" type="button" data-activity-choice="${key}">
                    <strong>${item.icon} ${item.label}</strong>
                    <span>${item.description}</span>
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="planner-form-group">
              <label for="taskDateSelect">Gün</label>
              <select id="taskDateSelect"></select>
            </div>

            <div class="planner-form-group">
              <label for="taskBlockSelect">Blok</label>
              <select id="taskBlockSelect">
                ${BLOCKS.map((block) => `<option value="${block.id}">${block.label}</option>`).join('')}
              </select>
            </div>

            <div class="planner-form-group">
              <label for="taskTrackSelect">Alan</label>
              <select id="taskTrackSelect">
                <option value="TYT">TYT</option>
                <option value="AYT">AYT</option>
              </select>
            </div>

            <div class="planner-form-group">
              <label for="taskSubjectSelect">Ders</label>
              <select id="taskSubjectSelect"></select>
            </div>

            <div class="planner-form-group full">
              <div class="helper-row">
                <label for="taskTopicInput">Konu</label>
                <label class="helper-inline">
                  <input type="checkbox" id="taskShowCompletedTopics" />
                  Tamamlanan konuları da göster
                </label>
              </div>
              <input type="text" id="taskTopicInput" placeholder="Örn: Fonksiyonlar, Paragraf, TYT Genel Deneme" autocomplete="off" />
              <div class="topic-suggestion-box" id="taskTopicSuggestions"></div>
            </div>

            <div class="planner-form-group">
              <label for="taskGoalTypeSelect">Hedef tipi</label>
              <select id="taskGoalTypeSelect">
                <option value="duration">Saat</option>
                <option value="questions">Soru</option>
                <option value="exams">Deneme</option>
              </select>
            </div>

            <div class="planner-form-group">
              <label for="taskGoalValueInput">Hedef değeri</label>
              <input type="number" id="taskGoalValueInput" min="1" step="1" value="2" />
            </div>

            <div class="planner-form-group full">
              <label for="taskNoteInput">Kısa not</label>
              <textarea id="taskNoteInput" placeholder="Örn: Önce fasikül özetini oku, sonra 30 orta seviye soru çöz."></textarea>
              <div class="modal-inline-note">Tamamlanan görevler Bearly içindeki konu yüzdelerine senkronize edilir.</div>
            </div>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="deleteTaskBtn" style="display:none;">Görevi Sil</button>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button type="button" class="btn-secondary" data-close-modal="taskModal">Vazgeç</button>
              <button type="submit" class="btn-primary">Görevi Kaydet</button>
            </div>
          </div>
        </form>
      </div>
    </div>

    <div class="auth-modal" id="aiPlanModal">
      <div class="auth-modal-overlay" data-close-modal="aiPlanModal"></div>
      <div class="auth-modal-card auth-modal-card--wide">
        <button class="auth-modal-x" data-close-modal="aiPlanModal">×</button>
        <div class="auth-modal-header">
          <div class="auth-modal-logo">✨</div>
          <div>
            <h2>Yapay Zeka Haftalık Planlayıcı</h2>
            <p>Günlük yükünü, eksiklerini ve hedef netini ver; sistem blok bazlı haftanı çıkarsın.</p>
          </div>
        </div>
        <form id="aiPlanForm">
          <div class="planner-form-grid">
            <div class="planner-form-group">
              <label for="aiFocusSelect">Hedef alan</label>
              <select id="aiFocusSelect">
                <option value="say">Sayısal</option>
                <option value="ea">Eşit Ağırlık</option>
                <option value="soz">Sözel</option>
                <option value="mixed">Karışık / Genel</option>
              </select>
            </div>
            <div class="planner-form-group">
              <label for="aiWeeklyHours">Haftalık toplam saat</label>
              <input type="number" id="aiWeeklyHours" min="4" step="1" value="20" />
            </div>
            <div class="planner-form-group">
              <label for="aiTargetNet">Hedef net</label>
              <input type="number" id="aiTargetNet" min="10" step="1" value="75" />
            </div>
            <div class="planner-form-group">
              <label for="aiWeakSubjects">En zayıf dersler</label>
              <input type="text" id="aiWeakSubjects" placeholder="Örn: TYT Matematik, AYT Fizik" />
            </div>
            <div class="planner-form-group full">
              <label>Uygun bloklar</label>
              <div class="choice-grid" id="aiBlockChoices">
                ${BLOCKS.map((block) => `
                  <button class="choice-btn active" type="button" data-ai-block="${block.id}">
                    <strong>${block.label}</strong>
                    <span>${block.window}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="planner-form-group full">
              <label for="aiCurrentTopics">Şu an hangi konulardasın?</label>
              <textarea id="aiCurrentTopics" placeholder="Örn: TYT matematikte problemler yarım, AYT kimyada organik yeni başladı, paragraf düzenli gidiyor."></textarea>
            </div>
            <div class="planner-form-group full">
              <label for="aiConstraints">Ek notlar</label>
              <textarea id="aiConstraints" placeholder="Örn: Çarşamba okul geç bitiyor, cumartesi sabah deneme istiyorum, pazar akşam tekrar olsun."></textarea>
            </div>
            <div class="planner-form-group full">
              <label class="helper-inline">
                <input type="checkbox" id="aiReplaceWeek" checked />
                Bu haftadaki planı yeniden kur (tamamlanmış görevler korunur)
              </label>
            </div>
          </div>
          <div id="aiPlanStatus" class="modal-inline-note"></div>
          <div class="modal-actions">
            <span class="modal-inline-note">AI planı konu tekrarlarını ve deneme bloklarını dengeli yaymaya çalışır.</span>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <button type="button" class="btn-secondary" data-close-modal="aiPlanModal">Kapat</button>
              <button type="submit" class="btn-primary">Planı Oluştur</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalsHtml);
}

function bindStaticEvents() {
  dom.prevWeekBtn.addEventListener('click', () => changeWeek(-1));
  dom.nextWeekBtn.addEventListener('click', () => changeWeek(1));
  dom.currentWeekBtn.addEventListener('click', () => resetWeek());
  dom.btnCreateBlank?.addEventListener('click', () => startBlankPlanner());
  dom.btnSelectTemplate?.addEventListener('click', () => openTemplateDrawer());
  dom.btnAiPlan?.addEventListener('click', () => openAiPlanModal());
  dom.analyzeBtn.addEventListener('click', () => analyzePlanner());
  dom.closeTemplateDrawer.addEventListener('click', closeDrawers);
  dom.closeAnalyzeDrawer.addEventListener('click', closeDrawers);
  dom.drawerOverlay.addEventListener('click', closeDrawers);
  dom.templateFilters.addEventListener('click', handleTemplateFilterClick);
  dom.templateList.addEventListener('click', handleTemplateApplyClick);
  dom.trackPreferenceSelect.addEventListener('change', handleTrackPreferenceChange);
  dom.toggleAllSubjectsBtn.addEventListener('click', toggleAllSubjects);
  dom.plannerBoard.addEventListener('click', handleBoardClick);
  dom.carryoverList.addEventListener('click', handleBoardClick);
  dom.plannerBoard.addEventListener('dragstart', handleDragStart);
  dom.carryoverList.addEventListener('dragstart', handleDragStart);
  dom.plannerBoard.addEventListener('dragend', handleDragEnd);
  dom.carryoverList.addEventListener('dragend', handleDragEnd);
  dom.plannerBoard.addEventListener('dragover', handleDragOver);
  dom.carryoverList.addEventListener('dragover', handleDragOver);
  dom.plannerBoard.addEventListener('dragleave', handleDragLeave);
  dom.carryoverList.addEventListener('dragleave', handleDragLeave);
  dom.plannerBoard.addEventListener('drop', handleDrop);
  dom.carryoverList.addEventListener('drop', handleDrop);

  document.querySelectorAll('[data-action="create-blank"]').forEach((button) => {
    button.addEventListener('click', () => startBlankPlanner());
  });
  document.querySelectorAll('[data-action="open-template"]').forEach((button) => {
    button.addEventListener('click', () => openTemplateDrawer());
  });
  document.querySelectorAll('[data-action="open-ai"]').forEach((button) => {
    button.addEventListener('click', () => openAiPlanModal());
  });

  document.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-close-modal]');
    if (!closeTarget) return;
    closeModal(closeTarget.getAttribute('data-close-modal'));
  });

  document.getElementById('activityChoices').addEventListener('click', handleActivityChoiceClick);
  document.getElementById('taskTrackSelect').addEventListener('change', () => {
    renderTaskSubjectOptions();
    renderTopicSuggestions();
  });
  document.getElementById('taskSubjectSelect').addEventListener('change', renderTopicSuggestions);
  document.getElementById('taskTopicInput').addEventListener('input', renderTopicSuggestions);
  document.getElementById('taskShowCompletedTopics').addEventListener('change', renderTopicSuggestions);
  document.getElementById('taskGoalTypeSelect').addEventListener('change', syncGoalValueField);
  document.getElementById('taskDateSelect').addEventListener('change', syncTaskPlacementState);
  document.getElementById('deleteTaskBtn').addEventListener('click', deleteEditingTask);
  document.getElementById('taskForm').addEventListener('submit', submitTaskForm);

  document.getElementById('taskTopicSuggestions').addEventListener('click', (event) => {
    const suggestion = event.target.closest('[data-topic]');
    if (!suggestion) return;
    document.getElementById('taskTopicInput').value = suggestion.getAttribute('data-topic');
    renderTopicSuggestions();
  });

  document.getElementById('aiBlockChoices').addEventListener('click', (event) => {
    const button = event.target.closest('[data-ai-block]');
    if (!button) return;
    button.classList.toggle('active');
  });
  document.getElementById('aiPlanForm').addEventListener('submit', submitAiPlanForm);
}

async function hydratePlanner() {
  const userProfile = await loadUserProfile();
  state.userLevel = userProfile.level;
  state.userTrack = userProfile.track;
  applyThemeBasedOnLevel(state.userLevel);

  const persisted = await loadPersistedPlanner();
  const normalized = normalizePlannerState(persisted);
  state.tasks = normalized.tasks;
  state.meta = normalized.meta;

  const carryoverChanged = runCarryoverSweep();
  renderPlanner();

  if (normalized.needsMigration || carryoverChanged) {
    queuePlannerSave(true);
  }
}

async function loadUserProfile() {
  if (!(state.currentUser && typeof db !== 'undefined' && db)) {
    return { level: 'lise', track: 'mixed' };
  }

  try {
    const userDoc = await db.collection('users').doc(state.currentUser.uid).get();
    if (userDoc.exists) {
      return {
        level: userDoc.data().level || 'lise',
        track: normalizeTrackPreference(userDoc.data().track),
      };
    }
  } catch (error) {
    console.error('Kullanıcı seviyesi okunamadı:', error);
  }

  return { level: 'lise', track: 'mixed' };
}

async function loadPersistedPlanner() {
  if (state.currentUser && typeof db !== 'undefined' && db) {
    try {
      const scheduleDoc = await db.collection('users').doc(state.currentUser.uid).collection('data').doc('schedule').get();
      if (scheduleDoc.exists) {
        return scheduleDoc.data();
      }
    } catch (error) {
      console.error('Bulut planı okunamadı:', error);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error('Yerel plan okunamadı:', error);
    return null;
  }
}

function normalizePlannerState(raw) {
  const defaultMeta = {
    version: PLANNER_VERSION,
    hasStarted: false,
    weekOffset: 0,
    lastCarryoverRun: null,
    aiCoachNote: '',
  };

  let tasks = [];
  let needsMigration = false;

  if (Array.isArray(raw?.tasks)) {
    tasks = raw.tasks.map(normalizeTask).filter(Boolean);
  } else if (Array.isArray(raw?.events)) {
    tasks = migrateLegacyEvents(raw.events);
    needsMigration = true;
  } else if (Array.isArray(raw?.data?.events)) {
    tasks = migrateLegacyEvents(raw.data.events);
    needsMigration = true;
  }

  const meta = { ...defaultMeta, ...(raw?.meta || {}) };
  if ((raw?.version || PLANNER_VERSION) !== PLANNER_VERSION) {
    needsMigration = true;
  }
  if (tasks.length > 0) {
    meta.hasStarted = true;
  }

  return { tasks, meta, needsMigration };
}

function migrateLegacyEvents(events) {
  const weekDates = getWeekDates(0);
  return events.map((event) => {
    const block = inferBlockFromHour(event.hour);
    const dayIndex = Math.max(0, Math.min(6, (Number(event.day) || 1) - 1));
    return normalizeTask({
      id: createId('legacy'),
      date: weekDates[dayIndex]?.key || formatDateKey(new Date()),
      block,
      track: inferTrackFromSubject(event.title),
      subject: event.title || 'Serbest Çalışma',
      topic: event.topic || event.title || 'Serbest Çalışma',
      activityType: event.aiNote ? 'topic' : 'practice',
      goalType: 'duration',
      goalValue: Math.max(1, Number(event.duration) || 1),
      status: 'todo',
      note: event.aiNote || '',
      source: 'legacy',
    });
  });
}

function inferBlockFromHour(hour) {
  const value = Number(hour) || 9;
  if (value < 12) return 'morning';
  if (value < 17) return 'afternoon';
  return 'evening';
}

function inferTrackFromSubject(subject) {
  const value = (subject || '').toLowerCase();
  if (['edebiyat', 'tarih-1', 'coğrafya-1', 'tarih-2', 'coğrafya-2'].some((item) => value.includes(item.toLowerCase()))) {
    return 'AYT';
  }
  return 'TYT';
}

function normalizeTask(rawTask) {
  if (!rawTask) return null;

  const activityType = ACTIVITY_TYPES[rawTask.activityType] ? rawTask.activityType : 'topic';
  const goalType = GOAL_TYPE_LABELS[rawTask.goalType] ? rawTask.goalType : ACTIVITY_TYPES[activityType].defaultGoalType;
  const dateValue = rawTask.date || null;
  const subject = rawTask.subject || 'Serbest Çalışma';

  return {
    id: rawTask.id || createId('task'),
    date: dateValue,
    block: dateValue ? rawTask.block || 'morning' : 'pool',
    track: rawTask.track || 'TYT',
    subject,
    topic: rawTask.topic || subject,
    activityType,
    goalType,
    goalValue: Math.max(1, Number(rawTask.goalValue) || 1),
    status: STATUS_META[rawTask.status] ? rawTask.status : 'todo',
    note: rawTask.note || '',
    aiNote: rawTask.aiNote || '',
    isCarryover: Boolean(rawTask.isCarryover),
    carriedFromDate: rawTask.carriedFromDate || '',
    source: rawTask.source || 'manual',
    order: Number(rawTask.order) || Number(rawTask.createdAt) || Date.now(),
    createdAt: Number(rawTask.createdAt) || Date.now(),
    updatedAt: Number(rawTask.updatedAt) || Date.now(),
  };
}

function applyThemeBasedOnLevel(level) {
  const normalized = (level || '').toLowerCase();
  const primaryKeywords = ['ilkokul', 'ortaokul'];
  state.isHighSchoolCategory = !primaryKeywords.some((keyword) => normalized.includes(keyword));

  dom.bodyArea.classList.toggle('theme-highschool', state.isHighSchoolCategory);
  dom.bodyArea.classList.toggle('theme-primary', !state.isHighSchoolCategory);
}

function runCarryoverSweep() {
  const todayKey = formatDateKey(new Date());
  let changed = false;

  state.tasks = state.tasks.map((task) => {
    if (task.date && task.date < todayKey && task.status !== 'done') {
      changed = true;
      return normalizeTask({
        ...task,
        date: null,
        block: 'pool',
        isCarryover: true,
        carriedFromDate: task.date,
        updatedAt: Date.now(),
      });
    }
    return task;
  });

  state.meta.lastCarryoverRun = todayKey;
  return changed;
}

function renderPlanner() {
  const hasPlanner = state.meta.hasStarted || state.tasks.length > 0;
  dom.scheduleEmpty.style.display = hasPlanner ? 'none' : 'flex';
  dom.plannerShell.style.display = hasPlanner ? 'block' : 'none';
  dom.analyzeBtn.style.display = hasPlanner ? 'inline-flex' : 'none';
  dom.plannerInitialLoader.style.display = 'none';
  dom.bodyArea.classList.remove('planner-booting');
  updateWeekLabel();

  if (!hasPlanner) {
    return;
  }

  renderSummaryCards();
  renderCoachInsights();
  renderWeekProgressCard();
  renderCarryoverPool();
  renderBoard();
  renderProgressGrid();
  renderTemplates();
}

function renderSummaryCards() {
  const weeklyTasks = getTasksForCurrentWeek();
  const doneCount = weeklyTasks.filter((task) => task.status === 'done').length;
  const scheduledCount = weeklyTasks.length;
  const doneRate = scheduledCount ? Math.round((doneCount / scheduledCount) * 100) : 0;
  const carryoverCount = getCarryoverTasks().length;
  const progressSnapshot = buildProgressSnapshot();
  const todayTasks = state.tasks.filter((task) => task.date === formatDateKey(new Date()));

  const cards = [
    {
      label: 'Haftalık Tamamlanma',
      value: `%${doneRate}`,
      meta: `${doneCount} / ${scheduledCount || 0} görev bu hafta yeşile döndü.`,
    },
    {
      label: 'Bugünkü Yük',
      value: `${todayTasks.length}`,
      meta: `${todayTasks.filter((task) => task.status === 'done').length} görev tamamlandı.`,
    },
    {
      label: 'Eksik Havuzu',
      value: `${carryoverCount}`,
      meta: carryoverCount > 0 ? 'Telafi edilecek bloklar seni bekliyor.' : 'Eksik havuzu şu an temiz görünüyor.',
    },
    {
      label: 'Konu İlerlemesi',
      value: `%${progressSnapshot.overallPercent}`,
      meta: `${progressSnapshot.completedTopicCount} konu tamamlandı, ${progressSnapshot.totalTopicCount} toplam takip ediliyor.`,
    },
  ];

  dom.plannerSummary.innerHTML = cards.map((card) => `
    <article class="summary-card">
      <span class="summary-label">${escapeHtml(card.label)}</span>
      <span class="summary-value">${escapeHtml(card.value)}</span>
      <p class="summary-meta">${escapeHtml(card.meta)}</p>
    </article>
  `).join('');
}

function renderCoachInsights() {
  dom.coachInsights.innerHTML = `
    <div class="coach-panel">
      <span class="section-tagline">Stratejik Yönlendirme</span>
      <h3>Günün Koç Ekranı</h3>
      <div class="coach-panel-sections">
        <section class="coach-motivation">
          <span class="coach-message-icon">🌟</span>
          <p>"Taşı delen suyun gücü değil, damlaların sürekliliğidir."</p>
        </section>
        <section class="coach-note-card">
          <div class="coach-note-head">
            <span class="coach-message-icon">⚠️</span>
            <strong>Koç Notu</strong>
          </div>
          <p>Eksik havuzunda 13 görev birikmiş durumda. Yeni konu çalışmasına geçmeden önce bugün havuzu eritmeye odaklanmalısın.</p>
        </section>
      </div>
    </div>
  `;
}

function renderWeekProgressCard() {
  const todayKey = formatDateKey(new Date());
  const todayTasks = state.tasks.filter((task) => task.date === todayKey);
  const completedToday = todayTasks.filter((task) => task.status === 'done').length;
  const weeklyTasks = getTasksForCurrentWeek();
  const activityCounts = countBy(weeklyTasks, (task) => task.activityType);
  const topSubjects = Object.entries(countBy(weeklyTasks, (task) => `${task.track} ${task.subject}`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  dom.weekProgressCard.innerHTML = `
    <span class="section-tagline">İlerleme hissi</span>
    <h3>Bu Hafta Nabız</h3>
    <div class="focus-stack">
      <p>${todayTasks.length > 0
        ? `Bugün için ${todayTasks.length} görev planlanmış. ${completedToday} tanesi tamamlandı.`
        : 'Bugün için henüz görev yok. Boş bir bloğu küçük bir hedefle açmak iyi bir başlangıç olur.'}</p>
      <div class="focus-pill-row">
        <span class="focus-pill">📖 Konu: ${activityCounts.topic || 0}</span>
        <span class="focus-pill">📝 Soru: ${activityCounts.practice || 0}</span>
        <span class="focus-pill">🔄 Tekrar: ${activityCounts.review || 0}</span>
        <span class="focus-pill">🎯 Deneme: ${activityCounts.exam || 0}</span>
      </div>
      <div class="focus-pill-row">
        ${topSubjects.length > 0
          ? topSubjects.map(([subject, count]) => `<span class="focus-pill">🔥 ${escapeHtml(subject)} · ${count} blok</span>`).join('')
          : '<span class="focus-pill">Planını başlatınca burada odak dağılımını göreceksin.</span>'}
      </div>
    </div>
  `;
}

function renderCarryoverPool() {
  const poolTasks = getCarryoverTasks();

  if (poolTasks.length === 0) {
    dom.carryoverList.innerHTML = '<div class="empty-pool">Şu anda eksik havuzu boş. Yarım kalan işler gece burada toplanacak.</div>';
    return;
  }

  dom.carryoverList.innerHTML = poolTasks.map((task) => renderTaskCard(task)).join('');
}

function renderBoard() {
  const weekDates = getWeekDates(state.meta.weekOffset);
  const todayKey = formatDateKey(new Date());

  let html = `
    <div class="planner-board-corner">
      <strong>Hafta</strong>
    </div>
  `;

  weekDates.forEach((day) => {
    html += `
      <div class="planner-board-head ${day.key === todayKey ? 'is-today' : ''}">
        <strong>${day.shortLabel}</strong>
        <span>${escapeHtml(day.longLabel)}</span>
      </div>
    `;
  });

  BLOCKS.forEach((block) => {
    html += `
      <div class="planner-row-label">
        <div>
          <strong>${escapeHtml(block.label)}</strong>
          <span>${escapeHtml(block.window)}</span>
        </div>
        <span>${escapeHtml(block.description)}</span>
      </div>
    `;

    weekDates.forEach((day) => {
      const tasks = getCellTasks(day.key, block.id);
      const isEmpty = tasks.length === 0;
      html += `
        <section class="planner-cell ${isEmpty ? 'is-empty' : ''}" data-date="${day.key}" data-block="${block.id}">
          ${isEmpty ? `
            <button class="cell-empty-cta" type="button" data-add-task data-date="${day.key}" data-block="${block.id}">
              + Görev Ekle
            </button>
          ` : `
            <div class="cell-header">
              <span class="cell-meta">${tasks.length} görev</span>
              <button class="cell-add-btn" type="button" data-add-task data-date="${day.key}" data-block="${block.id}">+ Görev</button>
            </div>
          `}
          <div class="task-list ${isEmpty ? 'is-empty' : ''}">
            ${tasks.length > 0
              ? tasks.map((task) => renderTaskCard(task, { compact: true })).join('')
              : ''}
          </div>
        </section>
      `;
    });
  });

  dom.plannerBoard.innerHTML = html;
}

function renderProgressGrid() {
  const snapshot = buildProgressSnapshot();
  const filteredSubjects = snapshot.subjects.filter((subject) => shouldRenderSubject(subject.key));

  dom.trackPreferenceSelect.value = state.userTrack;
  dom.toggleAllSubjectsBtn.textContent = state.meta.showAllSubjects ? 'Önerilen Dersleri Göster' : 'Tüm Dersleri Göster';

  if (filteredSubjects.length === 0) {
    dom.subjectProgressGrid.innerHTML = '<div class="progress-empty">İlerleme kartları tamamlanan görevlerle dolacak.</div>';
    return;
  }

  dom.subjectProgressGrid.innerHTML = filteredSubjects.map((subject) => `
    <article class="progress-card">
      <div class="progress-card-head">
        <strong>${escapeHtml(subject.label)}</strong>
        <span>%${subject.percent}</span>
      </div>
      <div class="progress-bar">
        <span style="width:${subject.percent}%"></span>
      </div>
      <p>${subject.completed}/${subject.total} Konu</p>
    </article>
  `).join('');
}

function buildProgressSnapshot() {
  const completedTopicKeys = new Set();
  const subjectStats = [];

  Object.entries(CURRICULUM).forEach(([track, subjects]) => {
    subjects.forEach((subject) => {
      const subjectKey = `${track}|${subject.name}`;
      const completedTopics = new Set(
        state.tasks
          .filter((task) => task.status === 'done' && task.track === track && task.subject === subject.name)
          .map((task) => task.topic.trim().toLowerCase())
      );

      subject.topics.forEach((topic) => {
        if (completedTopics.has(topic.toLowerCase())) {
          completedTopicKeys.add(`${subjectKey}|${topic.toLowerCase()}`);
        }
      });

      const completedCount = subject.topics.filter((topic) => completedTopics.has(topic.toLowerCase())).length;
      const totalCount = subject.topics.length;

      subjectStats.push({
        label: `${track} ${subject.name}`,
        key: subjectKey,
        completed: completedCount,
        total: totalCount,
        percent: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
      });
    });
  });

  const totalTopicCount = subjectStats.reduce((sum, item) => sum + item.total, 0);
  const completedTopicCount = subjectStats.reduce((sum, item) => sum + item.completed, 0);

  return {
    overallPercent: totalTopicCount ? Math.round((completedTopicCount / totalTopicCount) * 100) : 0,
    totalTopicCount,
    completedTopicCount,
    subjects: subjectStats.sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label, 'tr')),
  };
}

function getTasksForCurrentWeek() {
  const weekDates = getWeekDates(state.meta.weekOffset);
  const startKey = weekDates[0].key;
  const endKey = weekDates[weekDates.length - 1].key;
  return state.tasks.filter((task) => task.date && task.date >= startKey && task.date <= endKey);
}

function getCarryoverTasks() {
  return sortTasks(state.tasks.filter((task) => !task.date));
}

function getCellTasks(dateKey, blockId) {
  return sortTasks(state.tasks.filter((task) => task.date === dateKey && task.block === blockId));
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    return (a.order || a.createdAt || 0) - (b.order || b.createdAt || 0);
  });
}

function renderTaskCard(task, options = {}) {
  const statusMeta = STATUS_META[task.status];
  const activity = ACTIVITY_TYPES[task.activityType];
  const subjectStyle = getSubjectStyle(task.subject, task.activityType);
  const statusIcon = task.status === 'done' ? '✓' : (task.status === 'partial' ? '—' : '');
  const tooltipText = [task.topic, task.note || task.aiNote].filter(Boolean).join(' • ');
  const compactClass = options.compact ? 'compact' : '';

  return `
    <article
      class="planner-task ${compactClass} subject-${subjectStyle} status-${task.status} ${task.isCarryover ? 'is-carryover' : ''}"
      data-task-id="${task.id}"
      draggable="true"
      title="${escapeAttribute(tooltipText)}"
    >
      <button
        class="task-check status-${task.status}"
        type="button"
        title="${escapeHtml(statusMeta.label)} durumuna geçir"
        aria-label="${escapeHtml(statusMeta.label)} durumunu değiştir"
        data-task-action="cycle-status"
        data-task-id="${task.id}"
      >
        <span>${statusIcon}</span>
      </button>

      <div class="task-content">
        <div class="task-kicker-row">
          <span class="task-kicker">${escapeHtml(task.track)} · ${escapeHtml(task.subject)}</span>
          ${task.isCarryover ? `<span class="task-inline-chip carryover">Devreden</span>` : ''}
        </div>
        <h4 class="task-title">${escapeHtml(task.topic)}</h4>
        <div class="task-meta-row">
          <span class="task-inline-chip">${activity.icon} ${escapeHtml(activity.label)}</span>
          <span class="task-inline-chip">${escapeHtml(formatGoal(task))}</span>
        </div>
      </div>

      <div class="task-actions">
        <button
          class="task-icon-btn"
          type="button"
          title="Eksik havuzuna taşı"
          aria-label="Eksik havuzuna taşı"
          data-task-action="send-pool"
          data-task-id="${task.id}"
        >
          ↘
        </button>
      </div>
    </article>
  `;
}

function getSubjectStyle(subject, activityType) {
  if (activityType === 'exam' || subject === 'Genel Deneme') return 'exam';

  for (const subjects of Object.values(CURRICULUM)) {
    const match = subjects.find((item) => item.name === subject);
    if (match) return match.type;
  }

  return 'language';
}

function handleBoardClick(event) {
  const addButton = event.target.closest('[data-add-task]');
  if (addButton) {
    openTaskModal({
      date: addButton.getAttribute('data-date'),
      block: addButton.getAttribute('data-block'),
    });
    return;
  }

  const statusButton = event.target.closest('[data-task-action="cycle-status"]');
  if (statusButton) {
    cycleTaskStatus(statusButton.getAttribute('data-task-id'));
    return;
  }

  const poolButton = event.target.closest('[data-task-action="send-pool"]');
  if (poolButton) {
    moveTaskToPool(poolButton.getAttribute('data-task-id'));
    return;
  }

  const taskCard = event.target.closest('.planner-task');
  if (taskCard) {
    openTaskModal(null, taskCard.getAttribute('data-task-id'));
  }
}

function handleDragStart(event) {
  const taskCard = event.target.closest('.planner-task');
  if (!taskCard) return;
  state.dragTaskId = taskCard.getAttribute('data-task-id');
  taskCard.classList.add('is-dragging');
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', state.dragTaskId);

  const dragImage = taskCard.cloneNode(true);
  dragImage.style.position = 'absolute';
  dragImage.style.top = '-9999px';
  dragImage.style.left = '-9999px';
  dragImage.style.width = `${taskCard.offsetWidth}px`;
  dragImage.style.pointerEvents = 'none';
  dragImage.style.transform = 'rotate(1deg)';
  dragImage.style.opacity = '0.95';
  document.body.appendChild(dragImage);
  event.dataTransfer.setDragImage(dragImage, 24, 24);
  window.setTimeout(() => dragImage.remove(), 0);
}

function handleDragEnd(event) {
  const taskCard = event.target.closest('.planner-task');
  if (taskCard) {
    taskCard.classList.remove('is-dragging');
  }
  clearDropIndicators();
  state.dragTaskId = null;
}

function handleDragOver(event) {
  const cell = event.target.closest('.planner-cell');
  if (cell) {
    event.preventDefault();
    cell.classList.add('drag-over');
    const taskList = cell.querySelector('.task-list');
    if (taskList) {
      taskList.classList.add('drag-over');
    }
    return;
  }

  if (event.currentTarget === dom.carryoverList) {
    event.preventDefault();
    dom.carryoverList.classList.add('drag-over');
  }
}

function handleDragLeave(event) {
  const cell = event.target.closest('.planner-cell');
  if (cell && !cell.contains(event.relatedTarget)) {
    cell.classList.remove('drag-over');
    cell.querySelector('.task-list')?.classList.remove('drag-over');
  }

  if (event.currentTarget === dom.carryoverList && !dom.carryoverList.contains(event.relatedTarget)) {
    dom.carryoverList.classList.remove('drag-over');
  }
}

function handleDrop(event) {
  event.preventDefault();
  const taskId = state.dragTaskId || event.dataTransfer.getData('text/plain');
  if (!taskId) return;

  const cell = event.target.closest('.planner-cell');
  if (cell) {
    moveTask(taskId, {
      date: cell.getAttribute('data-date'),
      block: cell.getAttribute('data-block'),
    });
  } else if (event.currentTarget === dom.carryoverList) {
    moveTaskToPool(taskId);
  }

  clearDropIndicators();
  state.dragTaskId = null;
}

function clearDropIndicators() {
  document.querySelectorAll('.drag-over').forEach((element) => {
    element.classList.remove('drag-over');
  });
}

function moveTask(taskId, placement) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) return task;
    return normalizeTask({
      ...task,
      date: placement.date,
      block: placement.block,
      order: getNextOrderForPlacement(placement.date, placement.block, task.id),
      isCarryover: false,
      updatedAt: Date.now(),
    });
  });

  queuePlannerSave();
  renderPlanner();
}

function moveTaskToPool(taskId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) return task;
    return normalizeTask({
      ...task,
      date: null,
      block: 'pool',
      status: task.status === 'done' ? 'todo' : task.status,
      isCarryover: true,
      carriedFromDate: task.date || task.carriedFromDate || '',
      order: getNextOrderForPlacement(null, 'pool', task.id),
      updatedAt: Date.now(),
    });
  });

  queuePlannerSave();
  renderPlanner();
}

function cycleTaskStatus(taskId) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) return task;
    const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];

    if (!task.date && nextStatus === 'done') {
      return normalizeTask({
        ...task,
        date: formatDateKey(new Date()),
        block: 'evening',
        status: 'done',
        isCarryover: false,
        order: getNextOrderForPlacement(formatDateKey(new Date()), 'evening', task.id),
        updatedAt: Date.now(),
      });
    }

    return normalizeTask({
      ...task,
      status: nextStatus,
      isCarryover: nextStatus === 'done' ? false : task.isCarryover,
      updatedAt: Date.now(),
    });
  });

  queuePlannerSave();
  renderPlanner();
}

function startBlankPlanner() {
  state.meta.hasStarted = true;
  renderPlanner();
  queuePlannerSave();

  if (state.tasks.length === 0) {
    openTaskModal({
      date: formatDateKey(new Date()),
      block: 'morning',
    });
  }
}

function openTemplateDrawer() {
  state.meta.hasStarted = true;
  openDrawer(dom.templateDrawer);
  renderTemplates();
}

function openAiPlanModal() {
  state.meta.hasStarted = true;
  document.getElementById('aiPlanStatus').textContent = '';
  openModal('aiPlanModal');
}

function openDrawer(drawer) {
  dom.drawerOverlay.classList.add('active');
  drawer.classList.add('active');
}

function closeDrawers() {
  dom.drawerOverlay.classList.remove('active');
  dom.templateDrawer.classList.remove('active');
  dom.analyzeDrawer.classList.remove('active');
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

function renderTemplates() {
  const filters = [
    { id: 'all', label: 'Tümü' },
    { id: 'say', label: 'Sayısal' },
    { id: 'ea', label: 'EA' },
    { id: 'tyt', label: 'TYT' },
    { id: 'balanced', label: 'Telafi' },
  ];

  dom.templateFilters.innerHTML = filters.map((filter) => `
    <button class="template-filter-btn ${state.templateFilter === filter.id ? 'active' : ''}" type="button" data-template-filter="${filter.id}">
      ${escapeHtml(filter.label)}
    </button>
  `).join('');

  const templates = TEMPLATE_LIBRARY.filter((template) => {
    if (state.templateFilter === 'all') return true;
    return template.audience === state.templateFilter;
  });

  dom.templateList.innerHTML = templates.map((template) => `
    <article class="template-card">
      <h4>
        <span>${escapeHtml(template.title)}</span>
        <span>${template.hours} Saat</span>
      </h4>
      <p>${escapeHtml(template.description)}</p>
      <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">
        ${template.tags.map((tag) => `<span class="template-badge">${escapeHtml(tag)}</span>`).join('')}
      </div>
      <button class="btn-primary" style="width:100%; justify-content:center; border:none; cursor:pointer;" data-template-id="${template.id}">
        Bu Haftaya Uygula
      </button>
    </article>
  `).join('');
}

function handleTemplateFilterClick(event) {
  const button = event.target.closest('[data-template-filter]');
  if (!button) return;
  state.templateFilter = button.getAttribute('data-template-filter');
  renderTemplates();
}

function handleTemplateApplyClick(event) {
  const button = event.target.closest('[data-template-id]');
  if (!button) return;
  applyTemplate(button.getAttribute('data-template-id'));
}

function applyTemplate(templateId) {
  const template = TEMPLATE_LIBRARY.find((item) => item.id === templateId);
  if (!template) return;

  const weekDates = getWeekDates(state.meta.weekOffset);
  const newTasks = template.slots.map((slot) => normalizeTask({
    id: createId('tpl'),
    date: weekDates[slot.dayIndex]?.key || weekDates[0].key,
    block: slot.block,
    track: slot.track,
    subject: slot.subject,
    topic: slot.topic,
    activityType: slot.activityType,
    goalType: slot.goalType,
    goalValue: slot.goalValue,
    status: 'todo',
    source: 'template',
  }));

  state.meta.hasStarted = true;
  state.tasks = [...state.tasks, ...newTasks];
  state.meta.aiCoachNote = `${template.title} şablonu haftaya yerleştirildi. Gerekirse blokları sürükleyerek kişiselleştir.`;
  queuePlannerSave();
  closeDrawers();
  renderPlanner();
}

function openTaskModal(preset = {}, taskId = null) {
  const safePreset = preset || {};
  const editingTask = taskId ? state.tasks.find((task) => task.id === taskId) : null;
  const dateSelect = document.getElementById('taskDateSelect');
  const blockSelect = document.getElementById('taskBlockSelect');
  const activityInput = document.getElementById('taskActivityTypeInput');
  const trackSelect = document.getElementById('taskTrackSelect');
  const subjectSelect = document.getElementById('taskSubjectSelect');
  const topicInput = document.getElementById('taskTopicInput');
  const goalTypeSelect = document.getElementById('taskGoalTypeSelect');
  const goalValueInput = document.getElementById('taskGoalValueInput');
  const noteInput = document.getElementById('taskNoteInput');
  const taskIdInput = document.getElementById('taskIdInput');
  const deleteButton = document.getElementById('deleteTaskBtn');
  const topicToggle = document.getElementById('taskShowCompletedTopics');

  const chosenDate = editingTask ? (editingTask.date || 'pool') : (safePreset.date || formatDateKey(new Date()));
  const chosenBlock = editingTask ? editingTask.block : (safePreset.block || 'morning');

  document.getElementById('taskModalTitle').textContent = editingTask ? 'Görevi Düzenle' : 'Yeni Görev';
  document.getElementById('taskModalSubtitle').textContent = editingTask
    ? 'Blok, durum ve hedefi güncelleyerek görevi yeniden konumlandır.'
    : 'Görevi katı saate değil, gün içindeki uygun bloğa yerleştir.';

    taskIdInput.value = editingTask ? editingTask.id : '';
  activityInput.value = editingTask ? editingTask.activityType : 'topic';
  topicToggle.checked = false;
  dateSelect.innerHTML = buildTaskDateOptions(chosenDate);
  blockSelect.value = chosenDate === 'pool' ? 'morning' : chosenBlock;
  trackSelect.value = editingTask ? editingTask.track : 'TYT';
  renderTaskSubjectOptions(editingTask ? editingTask.subject : '');
  subjectSelect.value = editingTask ? editingTask.subject : (subjectSelect.value || 'Matematik');
  topicInput.value = editingTask ? editingTask.topic : '';
  goalTypeSelect.value = editingTask ? editingTask.goalType : ACTIVITY_TYPES[activityInput.value].defaultGoalType;
  goalValueInput.value = editingTask ? editingTask.goalValue : getDefaultGoalValue(goalTypeSelect.value);
  noteInput.value = editingTask ? (editingTask.note || editingTask.aiNote || '') : '';
  deleteButton.style.display = editingTask ? 'inline-flex' : 'none';

  setActiveActivityChoice(activityInput.value);
  syncTaskPlacementState();
  syncGoalValueField();
  renderTopicSuggestions();
  openModal('taskModal');
}

function buildTaskDateOptions(selectedDate) {
  const weekDates = getWeekDates(state.meta.weekOffset);
  const options = weekDates.map((day) => ({
    value: day.key,
    label: `${day.shortLabel} · ${day.longLabel}`,
  }));

  if (selectedDate && selectedDate !== 'pool' && !options.some((option) => option.value === selectedDate)) {
    options.unshift({
      value: selectedDate,
      label: formatLongDate(parseDateKey(selectedDate)),
    });
  }

  options.push({ value: 'pool', label: 'Eksik Havuzu / Plansız Görev' });

  return options.map((option) => `
    <option value="${option.value}" ${option.value === selectedDate ? 'selected' : ''}>
      ${escapeHtml(option.label)}
    </option>
  `).join('');
}

function handleActivityChoiceClick(event) {
  const button = event.target.closest('[data-activity-choice]');
  if (!button) return;

  const value = button.getAttribute('data-activity-choice');
  document.getElementById('taskActivityTypeInput').value = value;
  setActiveActivityChoice(value);
  document.getElementById('taskGoalTypeSelect').value = ACTIVITY_TYPES[value].defaultGoalType;
  syncGoalValueField();
}

function setActiveActivityChoice(activityType) {
  document.querySelectorAll('[data-activity-choice]').forEach((button) => {
    button.classList.toggle('active', button.getAttribute('data-activity-choice') === activityType);
  });
}

function renderTaskSubjectOptions(selectedSubject = '') {
  const track = document.getElementById('taskTrackSelect').value;
  const subjectSelect = document.getElementById('taskSubjectSelect');
  const subjects = getSubjectsForTrack(track);
  const specialSubjects = ['Genel Deneme'];
  const allSubjects = [...subjects.map((item) => item.name), ...specialSubjects];
  const resolvedSubject = allSubjects.includes(selectedSubject) ? selectedSubject : allSubjects[0];

  subjectSelect.innerHTML = allSubjects.map((subject) => `
    <option value="${subject}" ${subject === resolvedSubject ? 'selected' : ''}>${escapeHtml(subject)}</option>
  `).join('');
}

function renderTopicSuggestions() {
  const track = document.getElementById('taskTrackSelect').value;
  const subject = document.getElementById('taskSubjectSelect').value;
  const query = document.getElementById('taskTopicInput').value.trim().toLowerCase();
  const showCompleted = document.getElementById('taskShowCompletedTopics').checked;
  const suggestionBox = document.getElementById('taskTopicSuggestions');

  if (subject === 'Genel Deneme') {
    suggestionBox.innerHTML = '<button class="topic-suggestion" type="button" data-topic="TYT Genel Deneme">TYT Genel Deneme<small>İstersen başlığı serbestçe değiştirebilirsin.</small></button>';
    return;
  }

  const topics = getTopicsFor(track, subject);
  const completedTopics = getCompletedTopicSet(track, subject);

  const filtered = topics
    .map((topic) => ({ topic, completed: completedTopics.has(topic.toLowerCase()) }))
    .filter((item) => showCompleted || !item.completed)
    .filter((item) => !query || item.topic.toLowerCase().includes(query))
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.topic.localeCompare(b.topic, 'tr'))
    .slice(0, 16);

  if (filtered.length === 0) {
    suggestionBox.innerHTML = '<div class="topic-suggestion">Bu filtrede konu görünmüyor. Başlığı serbestçe yazabilirsin.</div>';
    return;
  }

  suggestionBox.innerHTML = filtered.map((item) => `
    <button class="topic-suggestion ${item.completed ? 'completed' : ''}" type="button" data-topic="${escapeAttribute(item.topic)}">
      ${escapeHtml(item.topic)}
      <small>${item.completed ? 'Daha önce tamamlandı, gerekirse tekrar olarak ekleyebilirsin.' : `${track} · ${subject}`}</small>
    </button>
  `).join('');
}

function syncGoalValueField() {
  const goalType = document.getElementById('taskGoalTypeSelect').value;
  const input = document.getElementById('taskGoalValueInput');
  input.value = input.value || getDefaultGoalValue(goalType);
  input.placeholder = GOAL_TYPE_LABELS[goalType];
}

function syncTaskPlacementState() {
  const dateValue = document.getElementById('taskDateSelect').value;
  const blockSelect = document.getElementById('taskBlockSelect');
  const disabled = dateValue === 'pool';
  blockSelect.disabled = disabled;
  blockSelect.style.opacity = disabled ? '0.55' : '1';
}

function getDefaultGoalValue(goalType) {
  if (goalType === 'questions') return 40;
  if (goalType === 'exams') return 1;
  return 2;
}

function submitTaskForm(event) {
  event.preventDefault();

  const existingTaskId = document.getElementById('taskIdInput').value;
  const dateValue = document.getElementById('taskDateSelect').value;
  const blockValue = document.getElementById('taskBlockSelect').value;
  const activityType = document.getElementById('taskActivityTypeInput').value;
  const track = document.getElementById('taskTrackSelect').value;
  const subject = document.getElementById('taskSubjectSelect').value;
  const topic = document.getElementById('taskTopicInput').value.trim() || defaultTopicFor(subject, activityType);
  const goalType = document.getElementById('taskGoalTypeSelect').value;
  const goalValue = Math.max(1, Number(document.getElementById('taskGoalValueInput').value) || 1);
  const note = document.getElementById('taskNoteInput').value.trim();

  const baseTask = existingTaskId
    ? state.tasks.find((task) => task.id === existingTaskId)
    : { id: createId('task'), createdAt: Date.now(), source: 'manual' };

  const task = normalizeTask({
    ...baseTask,
    date: dateValue === 'pool' ? null : dateValue,
    block: dateValue === 'pool' ? 'pool' : blockValue,
    activityType,
    track,
    subject,
    topic,
    goalType,
    goalValue,
    note,
    order: existingTaskId
      ? baseTask.order
      : getNextOrderForPlacement(dateValue === 'pool' ? null : dateValue, dateValue === 'pool' ? 'pool' : blockValue),
    updatedAt: Date.now(),
  });

  if (existingTaskId) {
    state.tasks = state.tasks.map((item) => item.id === existingTaskId ? task : item);
  } else {
    state.tasks = [...state.tasks, task];
  }

  state.meta.hasStarted = true;
  queuePlannerSave();
  closeModal('taskModal');
  renderPlanner();
}

function deleteEditingTask() {
  const taskId = document.getElementById('taskIdInput').value;
  if (!taskId) return;
  if (!window.confirm('Bu görevi silmek istediğine emin misin?')) return;

  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  queuePlannerSave();
  closeModal('taskModal');
  renderPlanner();
}

async function submitAiPlanForm(event) {
  event.preventDefault();

  const statusEl = document.getElementById('aiPlanStatus');
  const focus = document.getElementById('aiFocusSelect').value;
  const weeklyHours = Math.max(4, Number(document.getElementById('aiWeeklyHours').value) || 20);
  const targetNet = Math.max(10, Number(document.getElementById('aiTargetNet').value) || 75);
  const weakSubjects = document.getElementById('aiWeakSubjects').value.trim();
  const currentTopics = document.getElementById('aiCurrentTopics').value.trim();
  const constraints = document.getElementById('aiConstraints').value.trim();
  const replaceWeek = document.getElementById('aiReplaceWeek').checked;
  const availableBlocks = Array.from(document.querySelectorAll('[data-ai-block].active')).map((button) => button.getAttribute('data-ai-block'));

  if (availableBlocks.length === 0) {
    statusEl.textContent = 'En az bir uygun blok seçmelisin.';
    return;
  }

  statusEl.textContent = 'Haftalık plan hazırlanıyor...';

  try {
    const weekDates = getWeekDates(state.meta.weekOffset);
    const completedTopics = Array.from(getAllCompletedTopicKeys()).slice(0, 40);
    const currentTasks = getTasksForCurrentWeek().map((task) => ({
      date: task.date,
      block: task.block,
      track: task.track,
      subject: task.subject,
      topic: task.topic,
      activityType: task.activityType,
      status: task.status,
    }));

    const prompt = `
Sen deneyimli bir YKS koçusun. Bir öğrenci için haftalık blok bazlı plan oluşturacaksın.

Öğrenci seviyesi: ${state.userLevel || 'lise'}
Hedef alan: ${focus}
Haftalık saat: ${weeklyHours}
Hedef net: ${targetNet}
Zayıf dersler: ${weakSubjects || 'belirtilmedi'}
Mevcut durum: ${currentTopics || 'belirtilmedi'}
Ek notlar: ${constraints || 'belirtilmedi'}
Kullanılabilir bloklar: ${availableBlocks.join(', ')}
Bu haftanın günleri: ${weekDates.map((day, index) => `${index + 1}=${day.shortLabel} (${day.longLabel})`).join(' | ')}
Zaten tamamlanan konular: ${completedTopics.join(', ') || 'yok'}
Mevcut haftalık plan özeti: ${JSON.stringify(currentTasks)}

Kurallar:
- Sadece geçerli JSON dön.
- JSON formatı tam olarak şu olsun:
{"tasks":[{"day":1,"block":"morning","track":"TYT","subject":"Matematik","topic":"Problemler","activityType":"practice","goalType":"questions","goalValue":50,"note":"Kısa not","aiNote":"Koç tavsiyesi"}],"coachNote":"tek paragraf kısa koç notu"}
- day 1 ile 7 arasında olsun.
- block sadece ${availableBlocks.join(', ')} olabilir.
- activityType sadece topic, practice, exam veya review olabilir.
- goalType sadece duration, questions veya exams olabilir.
- Haftalık yük dengeli dağılsın.
- En az 1 tekrar görevi ekle.
- Uygunsa 1 deneme bloğu ekle.
- Tamamlanan konuları tekrar etmek gerekmiyorsa önermemeye çalış.
- Konular MEB/YKS uyumlu olsun.
- Markdown, açıklama, kod bloğu, yorum yazma. Sadece JSON.
    `;

    const responseText = await callGemini(prompt, 0.45);
    const parsed = parseJsonResponse(responseText);

    if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error('AI planında görev listesi bulunamadı.');
    }

    const aiTasks = parsed.tasks.map((task) => {
      const dayIndex = Math.max(0, Math.min(6, (Number(task.day) || 1) - 1));
      return normalizeTask({
        id: createId('ai'),
        date: weekDates[dayIndex]?.key || weekDates[0].key,
        block: availableBlocks.includes(task.block) ? task.block : availableBlocks[0],
        track: task.track === 'AYT' ? 'AYT' : 'TYT',
        subject: task.subject || 'Serbest Çalışma',
        topic: task.topic || task.subject || 'Serbest Çalışma',
        activityType: ACTIVITY_TYPES[task.activityType] ? task.activityType : 'topic',
        goalType: GOAL_TYPE_LABELS[task.goalType] ? task.goalType : 'duration',
        goalValue: Math.max(1, Number(task.goalValue) || 1),
        note: task.note || '',
        aiNote: task.aiNote || '',
        status: 'todo',
        source: 'ai',
      });
    });

    if (replaceWeek) {
      const currentWeekKeys = new Set(weekDates.map((day) => day.key));
      state.tasks = state.tasks.filter((task) => !(task.date && currentWeekKeys.has(task.date) && task.status !== 'done'));
    }

    state.tasks = [...state.tasks, ...aiTasks];
    state.meta.hasStarted = true;
    state.meta.aiCoachNote = parsed.coachNote || 'AI planı yerleşti. İlk hedef, blokların tamamını değil ritmini korumak olsun.';
    queuePlannerSave();
    statusEl.textContent = 'Plan başarıyla oluşturuldu.';
    closeModal('aiPlanModal');
    renderPlanner();
  } catch (error) {
    console.error(error);
    statusEl.textContent = error.message || 'AI planı oluşturulamadı.';
  }
}

async function analyzePlanner() {
  const weeklyTasks = getTasksForCurrentWeek();
  if (weeklyTasks.length === 0) {
    dom.analyzeContent.innerHTML = '<div style="padding:20px; color:var(--text-muted);">Analiz için önce bu haftaya birkaç görev ekle.</div>';
    openDrawer(dom.analyzeDrawer);
    return;
  }

  openDrawer(dom.analyzeDrawer);
  dom.analyzeContent.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Koç analizi hazırlanıyor... ⏳</div>';

  try {
    const progress = buildProgressSnapshot();
    const prompt = `
Sen deneyimli bir YKS koçusun. Aşağıdaki haftalık görev planını analiz et.

Öğrenci seviyesi: ${state.userLevel}
Haftalık görevler: ${JSON.stringify(weeklyTasks.map((task) => ({
      date: task.date,
      block: task.block,
      track: task.track,
      subject: task.subject,
      topic: task.topic,
      activityType: task.activityType,
      goal: formatGoal(task),
      status: task.status,
      carryover: task.isCarryover,
    })))}
Global ilerleme: ${JSON.stringify({
      overallPercent: progress.overallPercent,
      completedTopicCount: progress.completedTopicCount,
      carryoverCount: getCarryoverTasks().length,
    })}

Görev:
- Planın stratejik güçlü yanlarını söyle.
- Tek ders yükü, tekrar eksikliği veya fazla dağınıklık varsa belirt.
- Öğrenciyi motive eden, kısa ve uygulanabilir öneriler ver.
- Cevap maksimum 4 kısa paragraf veya madde olsun.
- Markdown kullanılabilir.
    `;

    const responseText = await callGemini(prompt, 0.5);
    dom.analyzeContent.innerHTML = formatMarkdownLite(responseText);
  } catch (error) {
    console.error(error);
    dom.analyzeContent.innerHTML = '<div style="color:var(--danger); padding:20px;">Analiz sırasında bir hata oluştu.</div>';
  }
}

async function callGemini(promptText, temperature = 0.5) {
  const payload = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      temperature,
      topP: 0.85,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      models: ['gemini-2.5-flash', 'gemini-2.0-flash-001', 'gemini-2.0-flash'],
      payload,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const code = errorBody?.error?.code || '';
    const message = errorBody?.error?.message || `API hatası: ${response.status}`;
    if (code === 'MISSING_SERVER_API_KEY') {
      throw new Error('Sunucuda Gemini anahtarı tanımlı değil.');
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseJsonResponse(responseText) {
  const cleaned = (responseText || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

function queuePlannerSave(immediate = false) {
  clearTimeout(state.saveTimer);
  if (immediate) {
    persistPlanner().catch((error) => console.error('Plan kaydedilemedi:', error));
    return;
  }

  state.saveTimer = window.setTimeout(() => {
    persistPlanner().catch((error) => console.error('Plan kaydedilemedi:', error));
  }, 250);
}

async function persistPlanner() {
  const progressSnapshot = buildProgressSnapshot();
  const payload = {
    version: PLANNER_VERSION,
    meta: state.meta,
    tasks: state.tasks.map((task) => ({
      ...task,
      updatedAt: task.updatedAt || Date.now(),
    })),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Yerel plan kaydedilemedi:', error);
  }

  if (!(state.currentUser && typeof db !== 'undefined' && db)) {
    return;
  }

  await db.collection('users').doc(state.currentUser.uid).collection('data').doc('schedule').set({
    ...payload,
    summary: {
      overallPercent: progressSnapshot.overallPercent,
      carryoverCount: getCarryoverTasks().length,
    },
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('users').doc(state.currentUser.uid).set({
    track: state.userTrack,
    studyPlannerProgress: {
      overallPercent: progressSnapshot.overallPercent,
      completedTopicCount: progressSnapshot.completedTopicCount,
      totalTopicCount: progressSnapshot.totalTopicCount,
      carryoverCount: getCarryoverTasks().length,
      subjects: progressSnapshot.subjects.reduce((acc, item) => {
        acc[item.key] = {
          label: item.label,
          percent: item.percent,
          completed: item.completed,
          total: item.total,
        };
        return acc;
      }, {}),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
  }, { merge: true });
}

function getNextOrderForPlacement(date, block, excludingTaskId = null) {
  const scopedTasks = state.tasks.filter((task) => {
    if (excludingTaskId && task.id === excludingTaskId) return false;
    const sameDate = (task.date || null) === (date || null);
    const sameBlock = (task.block || 'pool') === (block || 'pool');
    return sameDate && sameBlock;
  });

  if (scopedTasks.length === 0) {
    return Date.now();
  }

  const maxOrder = Math.max(...scopedTasks.map((task) => Number(task.order) || 0));
  return maxOrder + 1;
}

function handleTrackPreferenceChange(event) {
  state.userTrack = normalizeTrackPreference(event.target.value);
  queuePlannerSave();
  renderProgressGrid();
}

function toggleAllSubjects() {
  state.meta.showAllSubjects = !state.meta.showAllSubjects;
  queuePlannerSave();
  renderProgressGrid();
}

function changeWeek(direction) {
  state.meta.weekOffset += direction;
  renderPlanner();
  queuePlannerSave();
}

function resetWeek() {
  state.meta.weekOffset = 0;
  renderPlanner();
  queuePlannerSave();
}

function updateWeekLabel() {
  const weekDates = getWeekDates(state.meta.weekOffset);
  dom.weekLabel.textContent = `${weekDates[0].longLabel} - ${weekDates[6].longLabel}`;
}

function getWeekDates(offset = 0) {
  const baseWeek = startOfWeek(new Date());
  const shiftedWeek = addDays(baseWeek, offset * 7);
  return DAYS.map((shortLabel, index) => {
    const date = addDays(shiftedWeek, index);
    return {
      shortLabel,
      date,
      key: formatDateKey(date),
      longLabel: formatDateLabel(formatDateKey(date)),
    };
  });
}

function startOfWeek(baseDate) {
  const date = new Date(baseDate);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day);
  return date;
}

function addDays(baseDate, amount) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + amount);
  return date;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(dateKey) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'short',
  }).format(parseDateKey(dateKey));
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function formatGoal(task) {
  return `${task.goalValue} ${GOAL_TYPE_LABELS[task.goalType]}`;
}

function getSubjectsForTrack(track) {
  return CURRICULUM[track] || CURRICULUM.TYT;
}

function getTopicsFor(track, subject) {
  return getSubjectsForTrack(track).find((item) => item.name === subject)?.topics || [];
}

function getCompletedTopicSet(track, subject) {
  return new Set(
    state.tasks
      .filter((task) => task.status === 'done' && task.track === track && task.subject === subject)
      .map((task) => task.topic.toLowerCase())
  );
}

function getAllCompletedTopicKeys() {
  return new Set(
    state.tasks
      .filter((task) => task.status === 'done')
      .map((task) => `${task.track} ${task.subject} ${task.topic}`.toLowerCase())
  );
}

function defaultTopicFor(subject, activityType) {
  if (subject === 'Genel Deneme') {
    return activityType === 'exam' ? 'Genel Deneme' : 'Deneme Analizi';
  }
  return activityType === 'review' ? `${subject} Tekrarı` : `${subject} Çalışması`;
}

function normalizeTrackPreference(value) {
  const allowed = ['sayisal', 'esit_agirlik', 'sozel', 'dil', 'tyt', 'mixed'];
  return allowed.includes(value) ? value : 'mixed';
}

function shouldRenderSubject(subjectKey) {
  if (state.meta.showAllSubjects || state.userTrack === 'mixed') {
    return true;
  }

  const visibleKeys = getVisibleSubjectKeysForTrack(state.userTrack);
  return visibleKeys.has(subjectKey);
}

function getVisibleSubjectKeysForTrack(trackPreference) {
  const allTytKeys = (CURRICULUM.TYT || []).map((subject) => `TYT|${subject.name}`);

  const map = {
    sayisal: [...allTytKeys, 'AYT|Matematik', 'AYT|Geometri', 'AYT|Fizik', 'AYT|Kimya', 'AYT|Biyoloji'],
    esit_agirlik: [...allTytKeys, 'AYT|Matematik', 'AYT|Geometri', 'AYT|Edebiyat', 'AYT|Tarih-1', 'AYT|Coğrafya-1'],
    sozel: [...allTytKeys, 'AYT|Edebiyat', 'AYT|Tarih-1', 'AYT|Coğrafya-1', 'AYT|Tarih-2', 'AYT|Coğrafya-2', 'AYT|Felsefe Grubu', 'AYT|Din Kültürü'],
    dil: [...allTytKeys],
    tyt: [...allTytKeys],
    mixed: [...allTytKeys, ...(CURRICULUM.AYT || []).map((subject) => `AYT|${subject.name}`)],
  };

  return new Set(map[trackPreference] || map.mixed);
}

function countBy(list, selector) {
  return list.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function formatMarkdownLite(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}
