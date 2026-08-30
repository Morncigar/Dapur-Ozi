const supabaseUrl = 'https://ywrvgclnxgtgidvmwgvs.supabase.co';
const supabaseKey = 'sb_publishable_OZth7ZVCHh-BnWQQKOhBHg_4dyOSj3l';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// 1. Tarik memori keranjang dari browser (kalau ada), kalau kosong bikin object baru
let keranjang = JSON.parse(localStorage.getItem('dapurOzi_cart')) || {};
let listProduk = [];

async function init() {
    const { data, error } = await db
        .from('katalog_produk')
        .select('*')
        .eq('is_active', true)
        .order('kategori', { ascending: true });

    if (error) {
        document.getElementById('katalog-container').innerHTML = `
            <div class="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100 font-bold">
                Mesin database gagal merespons. Coba refresh halaman.
            </div>`;
        console.error(error);
        return;
    }

    listProduk = data;
    
    // Validasi keranjang sisaan: bersihin item yang ternyata udah dihapus nyokap dari etalase
    for (let id in keranjang) {
        if (!listProduk.find(p => p.id == id)) {
            delete keranjang[id];
        }
    }
    simpanKeranjang();

    renderKatalog();
    updateCheckoutBar(); // Panggil ini biar kalau ada sisa keranjang, bar bawah langsung nongol
}

function renderKatalog() {
    const container = document.getElementById('katalog-container');
    
    if (listProduk.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 text-[#8C7A70]">
                <p class="font-medium text-lg font-playfair italic">Belum ada menu yang ready.</p>
                <p class="text-sm mt-1 uppercase tracking-wider">Coba cek lagi besok ya!</p>
            </div>`;
        return;
    }

    let html = '';
    let currentKategori = '';

    listProduk.forEach(produk => {
        if (produk.kategori !== currentKategori) {
            html += `<h2 class="text-[11px] font-bold text-[#8C7A70] mt-8 mb-3 uppercase tracking-widest">${produk.kategori || 'Menu Lainnya'}</h2>`;
            currentKategori = produk.kategori;
        }

        const sisaKuota = produk.sisa_kuota;
        const stokAman = sisaKuota > 0;
        
        // Palet Sage Green buat sisa stok
        const statusBadge = stokAman 
            ? `<span class="text-[10px] font-black bg-[#D6E0D1] text-[#4A5D44] px-2 py-1 rounded-md uppercase tracking-wider shadow-sm">Sisa: ${sisaKuota}</span>` 
            : `<span class="text-[10px] font-black bg-[#EAE2D6] text-[#8C7A70] px-2 py-1 rounded-md uppercase tracking-wider">Habis</span>`;
        
        const qty = keranjang[produk.id] ? keranjang[produk.id].qty : 0;

        html += `
        <div class="bg-white rounded-2xl p-4 mb-4 flex flex-col transition-all border border-[#EAE2D6] shadow-[0_4px_15px_rgba(58,46,40,0.03)] ${!stokAman ? 'opacity-50 grayscale' : ''}">
            <div class="flex justify-between items-start mb-1">
                <h3 class="font-black font-playfair text-[#3A2E28] text-xl leading-tight">${produk.nama_produk}</h3>
                ${statusBadge}
            </div>
            <span class="font-bold text-[#D96C4A] text-sm mb-5 tracking-wide">Rp ${produk.harga_jual.toLocaleString('id-ID')}</span>
            
            <div class="flex justify-end mt-auto">
                ${stokAman ? `
                <div class="flex items-center bg-[#FDFBF7] rounded-xl p-1 border border-[#EAE2D6]">
                    <button onclick="ubahQty(${produk.id}, -1)" class="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#3A2E28] font-bold hover:text-[#D96C4A] active:scale-95 transition-all">-</button>
                    <span id="qty-${produk.id}" class="w-8 text-center font-bold text-[#3A2E28]">${qty}</span>
                    <button onclick="ubahQty(${produk.id}, 1)" class="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#3A2E28] font-bold hover:text-[#4A5D44] active:scale-95 transition-all">+</button>
                </div>
                ` : `<span class="text-[11px] text-[#8C7A70] font-bold uppercase tracking-wider bg-[#FDFBF7] px-4 py-2 rounded-xl border border-[#EAE2D6]">Tutup</span>`}
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

function ubahQty(id, jumlah) {
    const produk = listProduk.find(p => p.id === id);
    if (!produk) return;

    if (!keranjang[id]) {
        keranjang[id] = { data: produk, qty: 0 };
    }

    let newQty = keranjang[id].qty + jumlah;

    if (newQty > produk.sisa_kuota) {
        alert(`Batas maksimal! Stok ${produk.nama_produk} saat ini cuma ada ${produk.sisa_kuota}.`);
        return;
    }
    if (newQty < 0) newQty = 0;

    keranjang[id].qty = newQty;

    if (newQty === 0) {
        delete keranjang[id];
    }

    simpanKeranjang();
    document.getElementById(`qty-${id}`).innerText = newQty;
    updateCheckoutBar();
}

function simpanKeranjang() {
    // Inject data keranjang ke memory browser
    localStorage.setItem('dapurOzi_cart', JSON.stringify(keranjang));
}

function updateCheckoutBar() {
    let totalBelanja = 0;
    let totalItem = 0;

    for (let id in keranjang) {
        totalBelanja += keranjang[id].data.harga_jual * keranjang[id].qty;
        totalItem += keranjang[id].qty;
    }

    const bar = document.getElementById('checkout-bar');
    if (totalItem > 0) {
        bar.classList.remove('hidden');
        document.getElementById('total-harga').innerText = 'Rp ' + totalBelanja.toLocaleString('id-ID');
    } else {
        bar.classList.add('hidden');
    }
}

// 2. Fitur Double Check (Live Database Validation)
async function checkoutWA() {
    const tombolPesan = document.querySelector('#checkout-bar button');
    tombolPesan.innerHTML = '<span class="animate-pulse">Mengecek Stok...</span>';
    tombolPesan.disabled = true;

    let aman = true;
    let pesanError = '';

    // Cek ulang ke database Supabase secara real-time
    for (let id in keranjang) {
        const item = keranjang[id];
        const { data, error } = await db
            .from('katalog_produk')
            .select('sisa_kuota, nama_produk')
            .eq('id', id)
            .single();

        if (error || data.sisa_kuota < item.qty) {
            aman = false;
            pesanError += `- ${item.data.nama_produk} (Sisa di dapur: ${data ? data.sisa_kuota : 0})\n`;
        }
    }

    if (!aman) {
        alert(`Wah, ada yang keduluan di-checkout orang lain nih:\n\n${pesanError}\nHalaman akan dimuat ulang biar datanya update.`);
        localStorage.removeItem('dapurOzi_cart'); // Reset biar nggak error berulang
        location.reload();
        return;
    }

    // Kalau lolos validasi, lempar ke WA nyokap
    const noWA = "6282126027779"; 
    let pesan = "Halo Dapur Ozi, saya mau pesan:%0A%0A";
    let totalAll = 0;

    for (let id in keranjang) {
        const item = keranjang[id];
        const subtotal = item.qty * item.data.harga_jual;
        totalAll += subtotal;
        pesan += `▪️ ${item.qty}x ${item.data.nama_produk} (Rp ${subtotal.toLocaleString('id-ID')})%0A`;
    }

    pesan += `%0A*Total Belanja: Rp ${totalAll.toLocaleString('id-ID')}*%0A%0A`;
    pesan += `Untuk pengiriman ke daerah mana dan atas nama siapa ya?`;
    
    // Hapus memori keranjang karena udah sukses di-checkout
    localStorage.removeItem('dapurOzi_cart');
    
    window.open(`https://wa.me/${noWA}?text=${pesan}`, '_blank');
    
    // Balikin tombol ke semula
    setTimeout(() => {
        tombolPesan.innerHTML = '<span>Pesan</span>';
        tombolPesan.disabled = false;
        location.reload(); 
    }, 1000);
}

// Nyalain mesin
init();
