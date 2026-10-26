import { AttendanceRecord, AuditLog, ClassItem, SchoolDay, SessionInfo, Student, UserProfile } from '../types';
import { getTodayMalaysianDate, getMalaysianCurrentTime } from '../utils/dateUtils';

const STORAGE_KEY = 'SKB_APP_DATABASE_V3';

export interface LocalDatabaseSchema {
  users: UserProfile[];
  classes: ClassItem[];
  students: (Student & { plainToken: string })[];
  attendance: AttendanceRecord[];
  sessions: SessionInfo[];
  schoolDays: SchoolDay[];
  auditLogs: AuditLog[];
  currentUser: UserProfile | null;
}

// Data Rasmi Sekolah Rendah Kebangsaan Batandok Beaufort (XBA6003)
function getInitialSeed(): LocalDatabaseSchema {
  const today = getTodayMalaysianDate();
  const now = new Date().toISOString();

  const users: UserProfile[] = [
    {
      uid: 'USR_ADMIN_01',
      email: 'admin@sigoo.my',
      displayName: 'Guru Besar (SK Batandok)',
      role: 'ADMIN',
      active: true,
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'USR_TEACHER_01',
      email: 'guru@sigoo.my',
      displayName: 'Guru Bertugas (SK Batandok)',
      role: 'TEACHER',
      active: true,
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'USR_STAFF_01',
      email: 'staf@sigoo.my',
      displayName: 'Staf Operasi (SK Batandok)',
      role: 'STAFF',
      active: true,
      createdAt: now,
      updatedAt: now
    }
  ];

  const classes: ClassItem[] = [
  {
    id: "CLS_PRA",
    name: "PRASEKOLAH",
    yearLevel: 0,
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "CLS_1B",
    name: "1 BERUSAHA",
    yearLevel: 1,
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "CLS_2B",
    name: "2 BERILMU",
    yearLevel: 2,
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "CLS_3B",
    name: "3 BERJAYA",
    yearLevel: 3,
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "CLS_4B",
    name: "4 BESTARI",
    yearLevel: 4,
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "CLS_5B",
    name: "5 BIJAK",
    yearLevel: 5,
    active: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "CLS_6B",
    name: "6 BITARA",
    yearLevel: 6,
    active: true,
    createdAt: now,
    updatedAt: now
  }
];

  const students: (Student & { plainToken: string })[] = [
  {
    id: "STD_S014",
    studentNumber: "S014",
    fullName: "MARSYA SOFEA BINTI MOHD ROZIEDY",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S014_MARSYASOFEABINT",
    qrTokenHash: "83726086def5deb75e2f251cc6d1ab24765c88dccaa7b353b26703fe44da41e4",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S015",
    studentNumber: "S015",
    fullName: "MUHAMMAD DANISH EZHAM BIN MOHD AZHAR",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S015_MUHAMMADDANISHE",
    qrTokenHash: "fc7bdbef98f765ae10ebffc15e50968e955f0c01442cf9b16c58ec3a13b04754",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S016",
    studentNumber: "S016",
    fullName: "MUHAMMAD HAZMIEZAFUAN ALIF BIN ROZMIH",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S016_MUHAMMADHAZMIEZ",
    qrTokenHash: "411cbafc3eafd5035ca5ec15f0f2e8ef96734c98390582bce995079c3082cb75",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S017",
    studentNumber: "S017",
    fullName: "MUHAMMAD NUR RAMADHANI BIN JASMIN",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S017_MUHAMMADNURRAMA",
    qrTokenHash: "da5bf9246600465f5b9e380dd639db95c04779777939729a526758d4230706d1",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S018",
    studentNumber: "S018",
    fullName: "MUHAMMAD SHAKEEL ZIYAD BIN MOHD FADZI",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S018_MUHAMMADSHAKEEL",
    qrTokenHash: "3a06564ebb141fc7e17790bdb52c2e8eb823904b7b7539e69a77401565fb5bd8",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S019",
    studentNumber: "S019",
    fullName: "NIA NAIRA BINTI ASHNEL",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S019_NIANAIRABINTIAS",
    qrTokenHash: "bb69acb10e2af0fd9c769dce335eed9825b0cca4f6094b90e4601022f05c11bd",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S024",
    studentNumber: "S024",
    fullName: "NOOR ELLESYAH BINTI JUALI",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S024_NOORELLESYAHBIN",
    qrTokenHash: "2ad3aef4aab760d0caceea413bcd86b2ec2401ffe65c49b2411be22ebc702970",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S020",
    studentNumber: "S020",
    fullName: "NUR ALYA HIDAYAH BINTI AZRUL",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S020_NURALYAHIDAYAHB",
    qrTokenHash: "531607fbadf3c118caee8a79944ee2ea052d37fd87840bbb030518bfe7fa90a5",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S021",
    studentNumber: "S021",
    fullName: "NUR DHIYA SOFIA BINTI MOHD SUFFIN",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S021_NURDHIYASOFIABI",
    qrTokenHash: "44a0cc5079dd0f111f3a28ab38d9cd2256409d2f7e905e88f3c870194e0e507f",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S022",
    studentNumber: "S022",
    fullName: "NUR ERNAH ZAFYRA EZZATY BINTI RAHJALI",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Penolong Kelas",
    active: true,
    plainToken: "SKB_S022_NURERNAHZAFYRAE",
    qrTokenHash: "26f35bed2a7ba34d42a3bf80170c28fb79aee8e44d403e9c0ead3831d6c783c2",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S023",
    studentNumber: "S023",
    fullName: "NUR FARZANAH ELZIRA BINTI MOHD DAUD",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S023_NURFARZANAHELZI",
    qrTokenHash: "72bd5eee740a40fee672020878b6624bf5aee44f197017f46ddf6b7b4acbf28d",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S025",
    studentNumber: "S025",
    fullName: "SYAHMI BIN MOHD SOFFY",
    classId: "CLS_1B",
    className: "1 BERUSAHA",
    gender: "Lelaki",
    role: "Ketua Kelas",
    active: true,
    plainToken: "SKB_S025_SYAHMIBINMOHDSO",
    qrTokenHash: "37c287e3b6541a743b1c73c832ddc4c64c067aba33895a467eb421a0008296f5",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S026",
    studentNumber: "S026",
    fullName: "AHMAD DABITH BIN ZULKIFLI",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S026_AHMADDABITHBINZ",
    qrTokenHash: "46169e96060b7e8c01e301a36827e42e8587b3691e77dc7cc3532a3baebcf3e1",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S027",
    studentNumber: "S027",
    fullName: "AHNAF QAIS BIN AZMI",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S027_AHNAFQAISBINAZM",
    qrTokenHash: "5715c8acd373c32e6d1ac39b9ec1e0cc01a1a8a9d76b773dd0bdaed1be3c4245",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S028",
    studentNumber: "S028",
    fullName: "AWANGKU MOHAMMAD DANIH BIN AK.MOKTANIH",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S028_AWANGKUMOHAMMAD",
    qrTokenHash: "bdfcc38f9c8df79d5be27c02f050a440267234fa4a593559c07bf70ea76c9479",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S029",
    studentNumber: "S029",
    fullName: "FATHIYA SUMAYYAH BINTI SIMRIN",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S029_FATHIYASUMAYYAH",
    qrTokenHash: "8d04500cd384d17b535b880c6e97da0703c7bc7d08e7608889ed8184b982e9b7",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S030",
    studentNumber: "S030",
    fullName: "IZZ ZULFADLIE BIN MOHAMMAD ZULKHAIRI",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S030_IZZZULFADLIEBIN",
    qrTokenHash: "1957f876845722104185fbd6e03c1ae4c66077a4ba09c3893cdf35839e316c3e",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S038",
    studentNumber: "S038",
    fullName: "KHAULAH ALAZWAR BINTI MOHD. REDZWAN",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S038_KHAULAHALAZWARB",
    qrTokenHash: "48b5468f82580d2e6f8056665e7cc695acce524cd82ca4588d86e575ea3e0377",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S031",
    studentNumber: "S031",
    fullName: "MOHAMAD ZULFAHMI BIN MAT RIJIM",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Ketua Kelas",
    active: true,
    plainToken: "SKB_S031_MOHAMADZULFAHMI",
    qrTokenHash: "33c0272bf13413af59c511f89e2b2166619f06420cb3b9ee35ec55e9421df1ef",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S032",
    studentNumber: "S032",
    fullName: "MUHAMMAD ABID SOLEH BIN MOHD HAFIZI",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S032_MUHAMMADABIDSOL",
    qrTokenHash: "846778608936435ca9902e5366e8905102b886ddef237f3fc2e6c3936f548fbc",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S033",
    studentNumber: "S033",
    fullName: "MUHAMMAD AL FAYYADH BIN MOHD TAUFECK",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S033_MUHAMMADALFAYYA",
    qrTokenHash: "2ece0b92e061afd10471ee69f290985482a67fa6c6ad12596e89d80985b8f737",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S034",
    studentNumber: "S034",
    fullName: "MUHAMMAD SHAIFULLAH BIN ABDUL MALIK",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S034_MUHAMMADSHAIFUL",
    qrTokenHash: "57a78e6a13e97c1bb0967a4dcbe5795849808199d926a74eab0e5f2daa1c4b8a",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S035",
    studentNumber: "S035",
    fullName: "NOR ARIANA BINTI SAMAH",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S035_NORARIANABINTIS",
    qrTokenHash: "4e06ffc42516f7379bf0605b0f5c62a502c7daaeba5d0b68f10256393b673103",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S037",
    studentNumber: "S037",
    fullName: "NOR AYRA DHAFIYAH BINTI AL-ACRAM",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Perempuan",
    role: "Penolong Kelas",
    active: true,
    plainToken: "SKB_S037_NORAYRADHAFIYAH",
    qrTokenHash: "70e16a9d12e6435752b8f8ae1010b6bff61c6ab35778185773d69d2d30603cf2",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S036",
    studentNumber: "S036",
    fullName: "NURAIRIN SHAFIRAH BINTI ABDULLAH",
    classId: "CLS_2B",
    className: "2 BERILMU",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S036_NURAIRINSHAFIRA",
    qrTokenHash: "58244b9da8a378fb881e2d984207011c041602c81f196540cc24b183155bc148",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S039",
    studentNumber: "S039",
    fullName: "AFRINA DELISHA BINTI ABDUL HAFIZ",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S039_AFRINADELISHABI",
    qrTokenHash: "22714396e05ecdafa3582f126abd77dcf1da50061dc860783a6cc7905c1cfe9a",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S040",
    studentNumber: "S040",
    fullName: "AULIA FARWIZAH HUSNA BINTI MOHD.FAIZAN",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S040_AULIAFARWIZAHHU",
    qrTokenHash: "803041dfab24103f3bfc252de033d29658896df99f82d9781d5845a00db44344",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S041",
    studentNumber: "S041",
    fullName: "AWANGKU RAZIN AMZAR BIN AGKU SYAHRIL",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S041_AWANGKURAZINAMZ",
    qrTokenHash: "f9ec2f8cd5f776a96e04a891c586230137149b4a10a0dd54a74cb79a60b7c447",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S042",
    studentNumber: "S042",
    fullName: "HANNAH BINTI MOHD SOFFY",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S042_HANNAHBINTIMOHD",
    qrTokenHash: "fcc5b933d6a76a6f563d00df8c72387110556cdd393f3120cbf6edfa60fd17ba",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S043",
    studentNumber: "S043",
    fullName: "HANNAH HAFIZAH BINTI MAT LIADIN",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Penolong Kelas",
    active: true,
    plainToken: "SKB_S043_HANNAHHAFIZAHBI",
    qrTokenHash: "5a26351e8bfc7700a99698d5aa47d0ffb7f4e4a9e505d9c88944478f895cb4c4",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S044",
    studentNumber: "S044",
    fullName: "HARRAZ HAKIEM BIN BORHAN",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S044_HARRAZHAKIEMBIN",
    qrTokenHash: "357753628af99701cf601a93b33a493cc48254850ea1a1e25f807e37c27d144f",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S046",
    studentNumber: "S046",
    fullName: "MOHAMAD AIMAN BIN MIHAMAD SHANI",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S046_MOHAMADAIMANBIN",
    qrTokenHash: "ca75b8de723aa2dd766f079d5e9f328c61878edef68db10e005a4d664afd170b",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S045",
    studentNumber: "S045",
    fullName: "MOHAMAD RIZHAN BIN MOHD ROZIEDY",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S045_MOHAMADRIZHANBI",
    qrTokenHash: "e066f28bed1b1e47034c62759dc75a180a35ac0dd6131b2524f2c5043a8421f4",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S047",
    studentNumber: "S047",
    fullName: "MUHAMMAD AIDIL ZAFWAN BIN ABDULLAH",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Ketua Kelas",
    active: true,
    plainToken: "SKB_S047_MUHAMMADAIDILZA",
    qrTokenHash: "036c5f8bbbf2dbdd61ec9812152f534f01ab8704dfb4b2556dd27a17bd1bd278",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S048",
    studentNumber: "S048",
    fullName: "MUHAMMAD AL FATEH BIN MOHD TAUFECK",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S048_MUHAMMADALFATEH",
    qrTokenHash: "fc3d7e79a0f9d5d42d2eeb101932194746f13234c963d485e9400f34ed666dc2",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S058",
    studentNumber: "S058",
    fullName: "MUHAMMAD RASYA NAUFAL BIN RIZMAELEY",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S058_MUHAMMADRASYANA",
    qrTokenHash: "f144d3bcbb97ada69f09dfe7179cc79e4b7564e8366947474a6be86e9e73ac2a",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S049",
    studentNumber: "S049",
    fullName: "MUHAMMAD SHAFIQ HAIKAL BIN AG NAZRI",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S049_MUHAMMADSHAFIQH",
    qrTokenHash: "624e44eeb185ecf2fc31286232a356106090fbd19db0e2692e9f58a24cfd4040",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S050",
    studentNumber: "S050",
    fullName: "NAWAL HUSNA BINTI ABD. RASHID",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S050_NAWALHUSNABINTI",
    qrTokenHash: "ff1bc1cffd6ae7d4fbe160b7bee8b21221e3a873bcdd1257c6f6cb33a5e14ab8",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S051",
    studentNumber: "S051",
    fullName: "NOORLIYANA FARZANA BINTI ZULKIAH",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S051_NOORLIYANAFARZA",
    qrTokenHash: "35fb2df75f4024ef33c2b2c116ad04d62f86aba59f34b5d9b531e976c8972320",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S052",
    studentNumber: "S052",
    fullName: "NUR ALHA SUHARAH BINTI CHAN VOI LIONG@ALI",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S052_NURALHASUHARAHB",
    qrTokenHash: "872d0bd7cf6b75c87cdbcfb792ef9b9df83b3c2c1aed0a8af2ab573dc47918de",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S054",
    studentNumber: "S054",
    fullName: "NUR SYUHADAH BINTI TIASIN",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S054_NURSYUHADAHBINT",
    qrTokenHash: "32d772283a7a7e80346b137ceec8cf6d856a003cfff0c581662e88022af8c508",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S056",
    studentNumber: "S056",
    fullName: "NUR ZARAH AILANA BINTI JOSLEE",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S056_NURZARAHAILANAB",
    qrTokenHash: "88daf95d8391381afc5435b0e455330b6d281f4520374f89839fab35613b1eae",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S053",
    studentNumber: "S053",
    fullName: "NURSYAKHILA BINTI MAT SANIH",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S053_NURSYAKHILABINT",
    qrTokenHash: "ebf53b2871c0577ef127a8e1e7f74524a474086414dbe78e5448f9adf6bbb571",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S055",
    studentNumber: "S055",
    fullName: "NURUL IMAN FITRIAH BINTI ALIDIN",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S055_NURULIMANFITRIA",
    qrTokenHash: "14a5568b2388143d1c203c30cdf4ce047fed281fff70fea89a50519706b2136c",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S057",
    studentNumber: "S057",
    fullName: "SITI NORSYAKILLA BALQIS BINTI MOHD ZUMAT",
    classId: "CLS_3B",
    className: "3 BERJAYA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S057_SITINORSYAKILLA",
    qrTokenHash: "d470a0da4e2efa51700d69446e90b4f501d05fb339836cf05d860540125ca297",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S059",
    studentNumber: "S059",
    fullName: "ABDUL FATTAHUL HAIY BIN MOHD HAFIZI",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Lelaki",
    role: "Penolong Kelas",
    active: true,
    plainToken: "SKB_S059_ABDULFATTAHULHA",
    qrTokenHash: "0ca80d5056bcec24c9d4478f9dab165b5982e46343c7b83b15be4c9c384c8700",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S069",
    studentNumber: "S069",
    fullName: "AINUL MARDHIYAH BINTI ABDULLAH",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S069_AINULMARDHIYAHB",
    qrTokenHash: "d99ab040ca46a7b9de47fee868986c88d3b81f6a615e19033c937d7842246325",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S060",
    studentNumber: "S060",
    fullName: "IZZ ZULKIFLIE BIN ABDULLAH",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Lelaki",
    role: "Ketua Kelas",
    active: true,
    plainToken: "SKB_S060_IZZZULKIFLIEBIN",
    qrTokenHash: "992b9f41832e1b62ba1af08bcd79b9bdfd7986601123762080018d053a1f23ca",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S061",
    studentNumber: "S061",
    fullName: "MOHAMAD HAIZAM BIN JAPAR",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S061_MOHAMADHAIZAMBI",
    qrTokenHash: "0bb5f2f9d981bdabbb26392fbcf7cd9ed87df5addc982ee7bfe5a9907e8c3500",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S062",
    studentNumber: "S062",
    fullName: "MUHAMMAD AFIF UZAIR BIN MOHD FADZI",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S062_MUHAMMADAFIFUZA",
    qrTokenHash: "49a9906521718e337a3ea934e46cee80062782ee0ec0e5c2376fa304bc9b905d",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S063",
    studentNumber: "S063",
    fullName: "NUR ABIBIE ADAWIYAH BINTI AZRUL",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S063_NURABIBIEADAWIY",
    qrTokenHash: "ec0c2ad803fb15dd42481eed5b85fab7812081f125ff58bdfdc014039efd4ab4",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S064",
    studentNumber: "S064",
    fullName: "NUR ARDA ARISSA BINTI A.SAMBLIN",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S064_NURARDAARISSABI",
    qrTokenHash: "bdc8712267be9dbe690ee7102dc4db458e95f8cf3ec01a2d0ecefb535eaeffe3",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S065",
    studentNumber: "S065",
    fullName: "NUR DIANA SUFFIYANA BINTI MOHD SUFFIN",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S065_NURDIANASUFFIYA",
    qrTokenHash: "7b4498dccdda2ff6b82fd1c202cc3f44811208f45412c906e69e2b1ffc727571",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S066",
    studentNumber: "S066",
    fullName: "NURALEYA AISYAH FAZRI BIN ABDULLAH",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S066_NURALEYAAISYAHF",
    qrTokenHash: "ecd97b4619487283ec64908aaa0f7fb0b7105a2687679979ffa89371c5851e91",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S067",
    studentNumber: "S067",
    fullName: "NURSYUHADAH BINTI SHAHRUNIZAN",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S067_NURSYUHADAHBINT",
    qrTokenHash: "ba65a763f6923d85fbcacf850b47d1960ff88e68d440660ffae044e2805a5078",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S068",
    studentNumber: "S068",
    fullName: "NURUL FARHANA BINTI JASMIN",
    classId: "CLS_4B",
    className: "4 BESTARI",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S068_NURULFARHANABIN",
    qrTokenHash: "99ae2b9563a7a2799b1dc3d7fd39223162f0eaf133a1ce384658a3283be8651c",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S070",
    studentNumber: "S070",
    fullName: "AHMAD AIRIL BIN SAPIRIN",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S070_AHMADAIRILBINSA",
    qrTokenHash: "260142dc6433b9d2708b7f340c1c467d4c70b22a2a29e5cdbb4bc228fd15d755",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S071",
    studentNumber: "S071",
    fullName: "ALMAHFUDZZULISLAM BIN ALZOHARI",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S071_ALMAHFUDZZULISL",
    qrTokenHash: "08b1fd48751738b9ab06a85e70d8645d2cd48f7ee81fd2dfbad0f7ea16cd67f2",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S072",
    studentNumber: "S072",
    fullName: "DZULRAIQAL BIN ZAUNADDIN",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S072_DZULRAIQALBINZA",
    qrTokenHash: "8167e6c2112a7cef7411d78811f9ac56166eaa4df0ca9f1c92e088e16917ec69",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S073",
    studentNumber: "S073",
    fullName: "FIRASH AQIL BIN MD HIRWAN",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S073_FIRASHAQILBINMD",
    qrTokenHash: "dd6c56b0125c2e3d8ee596b7748fd83755c7639d7437482a926659ae7e9446fa",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S074",
    studentNumber: "S074",
    fullName: "IMAN DZUL HAKIM BIN ALIDIN",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S074_IMANDZULHAKIMBI",
    qrTokenHash: "d4fa60fecddc999dbf646babb287fb25f5031793ab7dad8ccbf499b48958c8f6",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S075",
    studentNumber: "S075",
    fullName: "MALEEKA HANNANI BINTI SUMARDI",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S075_MALEEKAHANNANIB",
    qrTokenHash: "b58c91e358c1f0e3c3436d71c98878d8595c28edcebb3ac465f1fb7244b8ed46",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S076",
    studentNumber: "S076",
    fullName: "MOHAMMAD HANIF BIN MAT LIADIN",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S076_MOHAMMADHANIFBI",
    qrTokenHash: "3e6bf46106b42bdd445cf534dac85ecb2635a37f4795c3af033cd06daa03a23b",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S087",
    studentNumber: "S087",
    fullName: "MUHAMMAD RAFA ADAM BIN RIZMAELEY",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Ketua Kelas",
    active: true,
    plainToken: "SKB_S087_MUHAMMADRAFAADA",
    qrTokenHash: "dec0e6074384c1cf96f39c306ff61143775088609d21804056b232d41ac9e276",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S077",
    studentNumber: "S077",
    fullName: "MUHAMMAD SYARNAZ AIRIEL BIN ALI",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S077_MUHAMMADSYARNAZ",
    qrTokenHash: "1ad5a7c57f43cec93c3e92c8229a84ae46dcc70955978f31d38e326023862958",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S078",
    studentNumber: "S078",
    fullName: "NIA RIANA BINTI ASHNEL",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S078_NIARIANABINTIAS",
    qrTokenHash: "86e2229863d6ca34e732bfe756f04d51120abb7e8b598221e81d3b856912c815",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S079",
    studentNumber: "S079",
    fullName: "NOR EMELDA BINTI OSMAN",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Penolong Kelas",
    active: true,
    plainToken: "SKB_S079_NOREMELDABINTIO",
    qrTokenHash: "a951c27e1420f31850124936b86723d3e43321aad9e48e39f6db6bd721a69184",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S080",
    studentNumber: "S080",
    fullName: "NORHAIZA NATAHSA BINTI JAPAR",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S080_NORHAIZANATAHSA",
    qrTokenHash: "938f90ec15ab2d6f67dbf7a5cd6164ccce2fb8c1713ce1ceded28d5cc009b987",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S081",
    studentNumber: "S081",
    fullName: "NUR ANNA DIANA BINTI YASMI",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S081_NURANNADIANABIN",
    qrTokenHash: "25047359c0b3bd8c9d4d9b2863e5358cd84a8733f80956c7b5405c95b9d6fd4d",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S082",
    studentNumber: "S082",
    fullName: "NUR DANIAH RANIYAH LAW BINTI KANNY LAW",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S082_NURDANIAHRANIYA",
    qrTokenHash: "0d141aecdb882aaa754b6cd726a302eb7d549b251dabecdfa195189668f5c753",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S083",
    studentNumber: "S083",
    fullName: "NUR ELMIEYRA QISTINA BALQIS BINTI RAHJALI",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S083_NURELMIEYRAQIST",
    qrTokenHash: "8676a8262971b209addee3653cb87e8a791d46e31527033de6c6a27bb534d343",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S084",
    studentNumber: "S084",
    fullName: "NURALISAH HAIRAH BINTI MAT KILLEH",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S084_NURALISAHHAIRAH",
    qrTokenHash: "adb7163b334e75e0410ea706f9579210952e73b6ab29437cb1d089dca849ddfe",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S085",
    studentNumber: "S085",
    fullName: "QISYA SYAFFIZAH BINTI MAT SAID",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S085_QISYASYAFFIZAHB",
    qrTokenHash: "b011ad6a1967b06c17a7c2759b8b7587c7b11f7348fe6b6a4dcdc3409a7ac55e",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S086",
    studentNumber: "S086",
    fullName: "SITI AFIQAH AMANI BINTI MOHD ZAINI",
    classId: "CLS_5B",
    className: "5 BIJAK",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S086_SITIAFIQAHAMANI",
    qrTokenHash: "e64749aa9e54f2910f514671892d45f40d9754b96713cf063712252390f71e70",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S088",
    studentNumber: "S088",
    fullName: "ADAM ZAFRAN ZAIDANI BIN SUMARDI",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S088_ADAMZAFRANZAIDA",
    qrTokenHash: "ced04fd9933b25b62836b87322c721834c6f7aa2e3bac5a247718dc96fb8032a",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S089",
    studentNumber: "S089",
    fullName: "AQIL FAKHRUDDIN BIN ABDULLAH",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Lelaki",
    role: "Ketua Kelas",
    active: true,
    plainToken: "SKB_S089_AQILFAKHRUDDINB",
    qrTokenHash: "883f5212f2170510c59c011cc2484e3e78e2846962c6848a72591851747dc075",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S090",
    studentNumber: "S090",
    fullName: "BALQIS NADIA BINTI ANIZAN",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S090_BALQISNADIABINT",
    qrTokenHash: "14a27c1832c4db75d43fa885025dce59694b6400942a2e79cd3761a7d49045c4",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S091",
    studentNumber: "S091",
    fullName: "MOHAMAD FAZRIL FIRDAUS BIN SANAWIN",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Lelaki",
    role: "Penolong Kelas",
    active: true,
    plainToken: "SKB_S091_MOHAMADFAZRILFI",
    qrTokenHash: "dab1260ab2a3f727426c640dd684f222aacc266189e25b838d072fc32fc497ce",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S092",
    studentNumber: "S092",
    fullName: "MUHAMMAD ADAM AFIQ BIN MOHD ZAINI",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S092_MUHAMMADADAMAFI",
    qrTokenHash: "c02581ecc7213a8de6923e66787e8c0f6a8605b5e73e62a2cd194cc463b2aa61",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S093",
    studentNumber: "S093",
    fullName: "MUHAMMAD SYARAWI BIN MOHD.REDZWAN",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S093_MUHAMMADSYARAWI",
    qrTokenHash: "373a3115c02d36037aa4d8b799d04c4b21e6c4ad168df037849125a4457d4ccf",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S094",
    studentNumber: "S094",
    fullName: "NORHAWA UMAIRA BINTI MAT RIJIM",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S094_NORHAWAUMAIRABI",
    qrTokenHash: "be99bfd78057e46efd997f1fb8d1c42bad7687f80df9877c8b4d0742dad0762d",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S095",
    studentNumber: "S095",
    fullName: "SITI FARISHA BINTI JAMALEH",
    classId: "CLS_6B",
    className: "6 BITARA",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S095_SITIFARISHABINT",
    qrTokenHash: "b0d1fd934550e4d5601acd059ce3d0fe018e0a09ad25d928e68e1d78c6d799ae",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S003",
    studentNumber: "S003",
    fullName: "ADHWAN HAQIMI BIN ZAUNADDIN",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S003_ADHWANHAQIMIBIN",
    qrTokenHash: "3c93a7bacca79e3c3f9c91ffce8864a6bfe50899c2ea60e975350d2261252472",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S001",
    studentNumber: "S001",
    fullName: "ARORA SUZIE BINTI AFENDY HAFIZAY",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S001_ARORASUZIEBINTI",
    qrTokenHash: "572c746d770c8f389b2784937a7ceed84dc3e34af36a4b08a5eafb423c510869",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S002",
    studentNumber: "S002",
    fullName: "AWANGKU MOHAMMAD DANISH BIN AK. MOKTANIH",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S002_AWANGKUMOHAMMAD",
    qrTokenHash: "cc31e9b401797f36e461234453408191e33972a1534947410e2829d73df29853",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S004",
    studentNumber: "S004",
    fullName: "HAWA HAMIZAH BINTI MAT LIADIN",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S004_HAWAHAMIZAHBINT",
    qrTokenHash: "3eab520eba69b588a0989db67b04da6197ec02aae155c7dca070c7640b678a50",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S005",
    studentNumber: "S005",
    fullName: "IEZYAN MADIHAH BINTI ABDULLAH",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S005_IEZYANMADIHAHBI",
    qrTokenHash: "a4a4cb2e21b4f40c48ec6ae5be6f40b84c625227fd52214966aedbc463eec590",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S013",
    studentNumber: "S013",
    fullName: "MOHAMAD REZAMIE HADIF BIN YASMIH",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S013_MOHAMADREZAMIEH",
    qrTokenHash: "62a31209d18f45ae89d9c1e1903bb5f378943ce7e3b1d1b4deb944647dbb98d7",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S006",
    studentNumber: "S006",
    fullName: "MUHAMAD ZAHRUL BIN OSMAN",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S006_MUHAMADZAHRULBI",
    qrTokenHash: "f78c7ba6293f66b4eb3f553ace95b7d72e30320c4bca4b49de627a6eac519ad6",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S007",
    studentNumber: "S007",
    fullName: "MUHAMMAD NASRULLAH BIN ABDUL MALIK",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S007_MUHAMMADNASRULL",
    qrTokenHash: "99b140c0c63ae7d6fd0f02cd540956f521d1516f8f08b343994492d8067190f6",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S008",
    studentNumber: "S008",
    fullName: "MUHAMMAD ZAFRAN BIN ABDULLAH",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S008_MUHAMMADZAFRANB",
    qrTokenHash: "e5c99acfbe6efc42c9df90f8ae8afdc6a58b827e48b04b3ddd03639d4ae14598",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S009",
    studentNumber: "S009",
    fullName: "NOAH EUSOFF BIN MOHD AZAHA",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Lelaki",
    role: "Murid",
    active: true,
    plainToken: "SKB_S009_NOAHEUSOFFBINMO",
    qrTokenHash: "06233ed3bc6693c5e6789b9de68ad90743fc9bc62fac6453f8d4c94eb5a6990a",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S010",
    studentNumber: "S010",
    fullName: "NURFATIHAH BINTI MATSANIH",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S010_NURFATIHAHBINTI",
    qrTokenHash: "ccd509d9e800134c6f851c04f8e1ac3a5a5b8d18ab0823d9f307f1cebe077875",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S011",
    studentNumber: "S011",
    fullName: "SITI AISYAH NURAMERA SOFEA BINTI MOHAMMAD YAZLIN",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S011_SITIAISYAHNURAM",
    qrTokenHash: "669694827f51d034973aae5b3fbffbeafb2bb8573ac28b4f2978857ad899dae4",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "STD_S012",
    studentNumber: "S012",
    fullName: "SITI NAZIRAH BINTI JAMES",
    classId: "CLS_PRA",
    className: "PRASEKOLAH",
    gender: "Perempuan",
    role: "Murid",
    active: true,
    plainToken: "SKB_S012_SITINAZIRAHBINT",
    qrTokenHash: "e861a42ac45bc786dbd45c57a2739d2a53e96055de2d489e152176f7a6c6e501",
    createdAt: now,
    updatedAt: now
  }
];

  const sessions: SessionInfo[] = [
    {
      id: `${today}_PAGI`,
      date: today,
      type: 'PAGI',
      startTime: '06:30',
      endTime: '08:00',
      lateAfter: '07:30',
      status: 'OPEN'
    },
    {
      id: `${today}_PULANG`,
      date: today,
      type: 'PULANG',
      startTime: '12:30',
      endTime: '14:30',
      lateAfter: '13:00',
      status: 'OPEN'
    }
  ];

  // Rekod Kehadiran Contoh Awal Hari Ini
  const attendance: AttendanceRecord[] = [
    {
      id: `STD_S014_${today}_PAGI`,
      studentId: 'STD_S014',
      studentNameSnapshot: 'MARSYA SOFEA BINTI MOHD ROZIEDY',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3600000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    },
    {
      id: `STD_S025_${today}_PAGI`,
      studentId: 'STD_S025',
      studentNameSnapshot: 'SYAHMI BIN MOHD SOFFY',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3400000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    },
    {
      id: `STD_S026_${today}_PAGI`,
      studentId: 'STD_S026',
      studentNameSnapshot: 'AHMAD DABITH BIN ZULKIFLI',
      classIdSnapshot: 'CLS_2B',
      classNameSnapshot: '2 BERILMU',
      date: today,
      session: 'PAGI',
      status: 'LEWAT',
      scannedAt: new Date(Date.now() - 2000000).toISOString(),
      scannedBy: 'USR_STAFF_01',
      source: 'QR',
      correctionReason: 'Tiba pada 07:35 pagi'
    },
    {
      id: `STD_S031_${today}_PAGI`,
      studentId: 'STD_S031',
      studentNameSnapshot: 'MOHAMAD ZULFAHMI BIN MAT RIJIM',
      classIdSnapshot: 'CLS_2B',
      classNameSnapshot: '2 BERILMU',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3000000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    },
    {
      id: `STD_S089_${today}_PAGI`,
      studentId: 'STD_S089',
      studentNameSnapshot: 'AQIL FAKHRUDDIN BIN ABDULLAH',
      classIdSnapshot: 'CLS_6B',
      classNameSnapshot: '6 BITARA',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3200000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'LOG_INIT_01',
      actorUid: 'USR_ADMIN_01',
      actorEmail: 'admin@sigoo.my',
      action: 'BOOTSTRAP_FIRST_ADMIN',
      entityType: 'USER',
      entityId: 'USR_ADMIN_01',
      reason: 'Inisialisasi Pentadbir Utama Sistem SK Batandok',
      createdAt: now
    },
    {
      id: 'LOG_INIT_02',
      actorUid: 'USR_ADMIN_01',
      actorEmail: 'admin@sigoo.my',
      action: 'IMPORT_STUDENTS_BATCH',
      entityType: 'STUDENT',
      entityId: 'BATCH_2026_OFFICIAL',
      reason: 'Pendaftaran 95 Murid Rasmi SK Batandok Beaufort 2026',
      createdAt: now
    }
  ];

  const schoolDays: SchoolDay[] = [];

  return {
    users,
    classes,
    students,
    attendance,
    sessions,
    schoolDays,
    auditLogs,
    currentUser: null
  };
}

export class MockDataStore {
  private data: LocalDatabaseSchema;

  constructor() {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch {
        raw = null;
      }
    }

    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch {
        this.data = getInitialSeed();
        this.save();
      }
    } else {
      this.data = getInitialSeed();
      this.save();
    }
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.data.currentUser;
  }

  setCurrentUser(u: UserProfile | null) {
    this.data.currentUser = u;
    this.save();
  }

  getUsers(): UserProfile[] {
    return this.data.users;
  }

  getClasses(): ClassItem[] {
    return this.data.classes;
  }

  addClass(item: ClassItem) {
    this.data.classes.push(item);
    this.save();
  }

  updateClass(id: string, updates: Partial<ClassItem>) {
    const c = this.data.classes.find(item => item.id === id);
    if (c) {
      Object.assign(c, updates);
      this.save();
    }
  }

  deleteClass(id: string) {
    this.data.classes = this.data.classes.filter(item => item.id !== id);
    // Kosongkan classId murid dalam kelas ini
    this.data.students.forEach(s => {
      if (s.classId === id) {
        s.classId = '';
        s.className = 'Tiada Kelas';
      }
    });
    this.save();
  }

  getStudents(classId?: string, activeOnly: boolean = false): Student[] {
    let list = this.data.students;
    if (classId && classId !== 'ALL') {
      list = list.filter(s => s.classId === classId);
    }
    if (activeOnly) {
      list = list.filter(s => s.active);
    }
    const classMap = new Map<string, string>();
    this.data.classes.forEach(c => classMap.set(c.id, c.name));
    return list.map(s => ({
      ...s,
      className: classMap.get(s.classId) || s.className || 'Kelas'
    }));
  }

  getStudentById(id: string): Student | undefined {
    return this.data.students.find(s => s.id === id);
  }

  findStudentByToken(token: string): (Student & { plainToken: string }) | undefined {
    const cleanToken = token.trim();
    return this.data.students.find(s => 
      s.plainToken === cleanToken || 
      cleanToken.includes(s.id) ||
      (s.studentNumber && cleanToken.includes(s.studentNumber)) ||
      cleanToken.toUpperCase() === s.fullName.toUpperCase()
    );
  }

  addStudent(student: Student & { plainToken: string }) {
    this.data.students.push(student);
    this.save();
  }

  updateStudent(id: string, updates: Partial<Student & { plainToken?: string }>) {
    const s = this.data.students.find(item => item.id === id);
    if (s) {
      Object.assign(s, updates);
      this.save();
    }
  }

  deleteStudent(id: string) {
    this.data.students = this.data.students.filter(item => item.id !== id);
    this.save();
  }

  clearAllSampleData() {
    this.data.classes = [];
    this.data.students = [];
    this.data.attendance = [];
    this.save();
  }

  getSessions(): SessionInfo[] {
    return this.data.sessions;
  }

  getSession(date: string, type: 'PAGI' | 'PULANG'): SessionInfo {
    const id = `${date}_${type}`;
    let s = this.data.sessions.find(item => item.id === id);
    if (!s) {
      s = {
        id,
        date,
        type,
        startTime: type === 'PAGI' ? '06:30' : '12:30',
        endTime: type === 'PAGI' ? '08:00' : '14:30',
        lateAfter: type === 'PAGI' ? '07:30' : '13:00',
        status: 'OPEN'
      };
      this.data.sessions.push(s);
      this.save();
    }
    return s;
  }

  setSession(info: SessionInfo) {
    const idx = this.data.sessions.findIndex(s => s.id === info.id);
    if (idx >= 0) {
      this.data.sessions[idx] = info;
    } else {
      this.data.sessions.push(info);
    }
    this.save();
  }

  getAttendance(date: string, session?: 'PAGI' | 'PULANG'): AttendanceRecord[] {
    let list = this.data.attendance.filter(r => r.date === date);
    if (session) {
      list = list.filter(r => r.session === session);
    }
    return list;
  }

  getMonthlyAttendance(year: number, month: number): AttendanceRecord[] {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    return this.data.attendance.filter(r => r.date.startsWith(prefix));
  }

  addAttendance(record: AttendanceRecord) {
    const existing = this.data.attendance.find(r => r.id === record.id);
    if (!existing) {
      this.data.attendance.unshift(record);
      this.save();
    }
  }

  updateAttendance(id: string, updates: Partial<AttendanceRecord>) {
    const r = this.data.attendance.find(item => item.id === id);
    if (r) {
      Object.assign(r, updates);
      this.save();
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  addAuditLog(log: AuditLog) {
    this.data.auditLogs.unshift({
      ...log,
      id: `LOG_${Date.now()}`
    });
    this.save();
  }

  resetToSeed() {
    this.data = getInitialSeed();
    this.save();
  }
}

export const mockStore = new MockDataStore();
