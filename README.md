
# ANTRI CETAK V3.9.6 - VS CODE CLEAN SOURCE

Ini adalah SOURCE ASLI yang readable, bukan yang minified `var bd=Object.create` yang kamu buka di screenshot.

## Kenapa file index.html kamu di VS Code aneh?
Karena yang kamu buka `index.html` itu adalah HASIL BUILD (sudah di-bundle Vite). Yang bisa diedit adalah `src/App.tsx`

## Cara pakai di VS Code (yang bener)
1. Trust folder dulu: di VS Code ada tulisan "Restricted Mode" di kiri atas → klik **Manage → Trust**
2. Buka Terminal di VS Code: `Ctrl + `` ` 
3. Install: `npm install`
4. Jalanin: `npm run dev` → buka http://localhost:5173

## Dimana edit ROLE biar CS ga bisa mulai cetak?
Buka `src/App.tsx` line 82-97 (sudah aku tandai FINAL ROLES):

```ts
// V3.9.5 FINAL ROLES - constants - EDIT DI SINI BRO
const CS_ONLY_IDS = ["uzi", "rizka", "susan"] as const;
const START_PRINT_IDS = ["indra", "riki", "adi", "tira"] as const; // siapa bisa MULAI
const SERAHKAN_ALLOWED_IDS = ["indra", "uzi", "rizka", "susan", "tira"] as const; // siapa bisa SERAHKAN
```

- Kalau mau CS bisa MULAI juga pas urgent: tambahin "uzi","rizka","susan" ke START_PRINT_IDS
- Kalau mau Operator bisa SERAHKAN: tambahin "riki","adi" ke SERAHKAN_ALLOWED_IDS

Lalu ada helper di bawahnya:
```ts
function canAddOrderId(id) -> siapa bisa +BARU
function canAssignId(id) -> cuma indra
function canStartPrintId(id) -> cek START_PRINT_IDS
function canSerahkanId(id) -> cek SERAHKAN_ALLOWED_IDS
```

## Supabase URL yang bener
Jangan pakai `/rest/v1/` di akhir!
Bener: `https://tcojxpfyftbjnmvyqubl.supabase.co`
Salah: `https://tcojxpfyftbjnmvyqubl.supabase.co/rest/v1/`

Set di gear ⚙️ di app, atau set di .env:
Buat file `.env` di root:
```
VITE_SUPABASE_URL=https://tcojxpfyftbjnmvyqubl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... anon public key kamu
```

## Build untuk Vercel
`npm run build` → hasilnya di folder `dist/` → upload folder `dist` ke Vercel atau push ke GitHub.

## Konsep LOCK V3.9.6
- Indra = all access
- CS Uzi,Rizka,Susan = +BARU + SERAHKAN doang
- Riki,Adi = MULAI doang
- Tira = +BARU + MULAI + SERAHKAN

Mau ubah apapun, chat aku: "bro di App.tsx line 84 ganti..."
