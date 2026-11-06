# Relik Hutan Cahaya — CinemaX Adventure
Game petualangan top-down: jelajahi hutan gelap dengan obor (fog of war), kumpulkan 3 💎, ambil 🗝️ untuk membuka 🚪,
hindari slime 🟢, lalu masuki kuil 🏛️.

Buka `index.html` (tanpa instalasi/CDN/jaringan). Kontrol: WASD/panah, tombol layar di HP.
**Layar penuh:** tombol ⛶, tombol `F`, atau klik dua kali pada game. `P` jeda · `M` suara.
Catatan: iPhone Safari tidak mendukung Fullscreen API untuk elemen biasa — tombol dinonaktifkan otomatis di sana.

Keamanan: CSP ketat, tanpa innerHTML/eval, rekor di localStorage (sisi klien, bukan anti-curang).
Uji: `node tests/test.js` (peta terjangkau, fuzz, jalur menang).
