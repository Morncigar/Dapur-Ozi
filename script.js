// Konfigurasi Supabase
const supabaseUrl = 'https://ywrvgclnxgtgidvmwgvs.supabase.co';
const supabaseKey = 'sb_publishable_OZth7ZVCHh-BnWQQKOhBHg_4dyOSj3l';
const db = supabase.createClient(supabaseUrl, supabaseKey);

// State Management
let keranjang = {};
let listProduk = [];

// Inisiasi
async function init() {
    const { data, error } = await db
        .from('katalog_produk')
        .select('*')
        .eq('is_active', true)
        .order('kategori', { ascending: true });

    if (error) {
        document.getElementById('katalog-container').innerHTML = `
            <div class="bg-[#FBEBE8] text-[#8C3A2B] p-4 rounded-xl text-center border border-[#F2D0CC]">
                Koneksi ke dapur terhalang. Coba refresh halaman.
            </div>`;
        console.error(error);
        return;
    }

    listProduk = data;
    renderKatalog();
}

// Render HTML dari JS
function renderKatalog() {
    const container = document.getElementById('katalog-container');
    
    if (listProduk.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 text-[#8C7A70]">
                <p class="font-medium text-lg">Belum ada menu yang ready.</p>
                <p class="text-sm mt-1">Coba cek lagi besok ya!</p>
            </div>`;
        return;
    }

    let html = '';
    let currentKategori = '';

    listProduk.forEach(produk => {
        if (produk.kategori !== currentKategori) {
            html += `<h2 class="text-sm font-black text-[#6B5B52] mt-6 mb-3 uppercase tracking-wider">${produk.kategori || 'Menu Lainnya'}</h2>`;
            currentKategori = produk.kategori;
        }

        const sisaKuota = produk.sisa_kuota;
        const stokAman = sisaKuota > 0;
        const statusBadge = stokAman 
            ? `<span class="text-[10px] font-bold bg-[#EFECE6] text-[#5C4033] px-2 py-1 rounded-md uppercase tracking-wider">Sisa: ${sisaKuota}</span>` 
            : `<span class="text-[10px] font-bold bg-[#E6E0D5] text-[#7A6B63] px-2 py-1 rounded-md uppercase tracking-wider">Habis</span>`;
        
        const qty = keranjang[produk.id] ? keranjang[produk.id].qty : 0;

        html += `
        <div class="bg-[#FFFDF9] rounded-2xl shadow-sm border border-[#EBE3D5] p-4 mb-4 flex flex-col transition-all ${!stokAman ? 'opacity-60 grayscale' : 'hover:shadow-md'}">
            <div class="flex justify-between items-start mb-1">
                <h3 class="font-bold text-[#3B2F2F] text-[17px] leading-tight">${produk.nama_produk}</h3>
                ${statusBadge}
            </div>
            <span class="font-bold text-[#7A6B63] text-sm mb-4">Rp ${produk.harga_jual.toLocaleString('id-ID')}</span>
            
            <div class="flex justify-end mt-auto">
                ${stokAman ? `
                <div class="flex items-center bg-[#F4EFE6] rounded-xl p-1 border border-[#EBE3D5]">
                    <button onclick="ubahQty(${produk.id}, -1)" class="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#5C4033] font-bold hover:text-red-600 active:scale-95 transition-all">-</button>
                    <span id="qty-${produk.id}" class="w-8 text-center font-bold text-[#3B2F2F]">${qty}</span>
                    <button onclick="ubahQty(${produk.id}, 1)" class="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-sm text-[#5C4033] font-bold hover:text-green-600 active:scale-95 transition-all">+</button>
                </div>
                ` : `<span class="text-sm text-[#8C7A70] font-medium bg-[#F4EFE6] px-4 py-2 rounded-xl">Pre-order Tutup</span>`}
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
}

// Logika Kalkulasi
function ubahQty(id, jumlah) {
    const produk = listProduk.find(p => p.id === id);
    if (!produk) return;

    if (!keranjang[id]) {
        keranjang[id] = { data: produk, qty: 0 };
    }

    let newQty = keranjang[id].qty + jumlah;

    if (newQty > produk.sisa_kuota) {
        alert(`Stok ${produk.nama_produk} cuma sisa ${produk.sisa_kuota} nih. Nggak bisa pesan lebih dari itu.`);
        return;
    }
    if (newQty < 0) newQty = 0;

    keranjang[id].qty = newQty;

    if (newQty === 0) {
        delete keranjang[id];
    }

    document.getElementById(`qty-${id}`).innerText = newQty;
    updateCheckoutBar();
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

// Lempar ke WA Nyokap
function checkoutWA() {
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
    
    window.open(`https://wa.me/${noWA}?text=${pesan}`, '_blank');
}

// Nyalain mesin
init();