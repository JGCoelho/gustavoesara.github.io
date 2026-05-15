// ============================================================
// Supabase
// ============================================================

const SUPABASE_URL =
  "https://kuylefbuxhonbcliyiwo.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_PssbbuPHCx5AOZU8ZuwDdA_TrRWto9s";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ============================================================
// Elements
// ============================================================

const modal = document.getElementById("modal-pix");

const fecharModal =
  document.getElementById("fechar-modal");

const overlay =
  document.getElementById("overlay");

const copiarPix =
  document.getElementById("copiar-pix");

const etapaReserva =
  document.getElementById("etapa-reserva");

const etapaPix =
  document.getElementById("etapa-pix");

// ============================================================
// Global State
// ============================================================

let presenteSelecionado = null;

// ============================================================
// Modal
// ============================================================

function abrirModal(presente) {

  presenteSelecionado = presente;

  // Atualiza PIX dinamicamente
  const pixContainer = document.querySelector(
    "#etapa-pix .break-all"
  );

  const qrImage = document.querySelector(
    "#etapa-pix img"
  );

  if (pixContainer) {
    pixContainer.innerText =
      presente.pix_code || "PIX indisponível";
  }

  if (qrImage && presente.pix_qr_url) {
    qrImage.src = presente.pix_qr_url;
  }

  modal?.classList.remove("hidden");

}

document
    .getElementById("cancelar-modal")
    .addEventListener("click", fecharModalPix)

function fecharModalPix() {

  modal?.classList.add("hidden");

  presenteSelecionado = null;

  etapaReserva?.classList.remove("hidden");

  etapaPix?.classList.add("hidden");

}

// ============================================================
// Mostrar PIX
// ============================================================

function mostrarPix() {

  document
    .getElementById("etapa-reserva")
    .classList.add("hidden")

  document
    .getElementById("etapa-pix")
    .classList.remove("hidden")


  gerarPixDoPresente(presenteSelecionado)
}

// ============================================================
// Copiar PIX
// ============================================================

if (copiarPix) {

  copiarPix.addEventListener("click", () => {

    if (!presenteSelecionado?.pix_code) return;

    navigator.clipboard.writeText(
      presenteSelecionado.pix_code
    );

    copiarPix.innerText =
      "Chave copiada ✓";

    setTimeout(() => {

      copiarPix.innerText =
        "Copiar chave PIX";

    }, 2000);

  });

}

// ============================================================
// Reservar Presente
// ============================================================

async function reservarPresente() {

  if (!presenteSelecionado) return;

  const nome = prompt(
    "Digite seu nome para reservar:"
  );

  if (!nome) return;

  // Gera payload PIX do presente
  const payloadPix = gerarPixDoPresente(
    presenteSelecionado
  );

  const agora = new Date();

  const expira = new Date(
    agora.getTime() +
    48 * 60 * 60 * 1000
  );

  const { data, error } = await supabaseClient
    .from("presents")
    .update({
      status: "reserved",
      reserved_at: agora.toISOString(),
      expires_at: expira.toISOString(),
      reserved_by: nome,
      pix_code: payloadPix
    })
    .eq("id", presenteSelecionado.id)
    .eq("status", "available")
    .select();

  if (error) {

    console.error(error);

    alert(
      "Erro ao reservar presente."
    );

    return;

  }

  if (!data || data.length === 0) {

    alert(
      "Este presente acabou de ser reservado por outra pessoa."
    );

    await carregarPresentes();

    fecharModalPix();

    return;

  }

  mostrarPix();

  await carregarPresentes();

}

// ============================================================
// Expirar Reservas
// ============================================================

async function expirarReservas() {

  await supabaseClient
    .from("presents")
    .update({
      status: "available",
      reserved_at: null,
      reserved_by: null,
      expires_at: null,
      pix_code:payload
    })
    .eq("status", "reserved")
    .lt(
      "expires_at",
      new Date().toISOString()
    );

}

// ============================================================
// Carregar Presentes
// ============================================================
function gerarPixDoPresente(presente) {

  const payload = gerarPayloadPix({
    pixKey: "josegustavocoelho@gmail.com",
    description: presente.name,
    merchantName: "GUSTAVO E SARA",
    merchantCity: "GOVVALADARES",
    amount: Number(presente.price),
    txid: `PRESENTE${presente.id}`
  })

  // Atualiza texto copia-e-cola
  document.querySelector("#etapa-pix .break-all").textContent = payload

  // Container QR
  const qrContainer = document.getElementById("qrcode")

  // Limpa QR anterior
  qrContainer.innerHTML = ""

  // Gera QR
  new QRCode(qrContainer, {
    text: payload,
    width: 220,
    height: 220
  })

  return payload
}

async function carregarPresentes() {

  // Expira reservas antigas
  await expirarReservas();

  const { data, error } =
    await supabaseClient
      .from("presents")
      .select("*")
      .order("id");

  if (error) {

    console.error(error);

    return;

  }

  const grid =
    document.getElementById(
      "presentes-grid"
    );

  if (!grid) return;

  const cards = data.map(
    (presente) => {

      return `
        <div class="bg-[#FFFDF9]/90 rounded-3xl p-10 shadow-[0_10px_40px_rgba(107,98,40,0.08)] hover:shadow-lg transition duration-300">

          ${
            presente.image_url
              ? `
                <img
                  src="${presente.image_url}"
                  class="w-full h-56 object-cover rounded-2xl mb-6"
                >
              `
              : ""
          }

          <h3 class="text-3xl mb-5">
            ${presente.name || "Sem nome"}
          </h3>

          <p class="mb-8 text-[#7A7340] leading-relaxed">
            ${presente.description || ""}
          </p>

          <p class="text-3xl font-semibold mb-8">
            R$ ${presente.price || 0}
          </p>

          ${
            presente.status === "paid"
              ? `
                <div class="w-full border border-[#6B6228] text-[#6B6228] py-4 rounded-xl text-center bg-[#F7F0E8]">
                  Presenteado ✨
                </div>
              `

              : presente.status === "reserved"

              ? `
                <div class="w-full border border-yellow-700 text-yellow-700 py-4 rounded-xl text-center bg-yellow-50">
                  Reservado
                </div>
              `

              : `
                <button
                  class="abrir-modal w-full bg-[#6B6228] text-white py-4 rounded-xl hover:bg-[#5A5322] transition"
                  data-id="${presente.id}"
                >
                  Presentear
                </button>
              `
          }

        </div>
      `;

    }
  ).join("");

  grid.innerHTML = cards;

  // Event listeners
  document
    .querySelectorAll(".abrir-modal")
    .forEach((botao) => {

      botao.addEventListener(
        "click",
        () => {

          const id =
            botao.dataset.id;

          const presente =
            data.find(
              (p) => p.id == id
            );

          abrirModal(presente);

        }
      );

    });

}

// ============================================================
// Event Listeners
// ============================================================

if (fecharModal) {

  fecharModal.addEventListener(
    "click",
    fecharModalPix
  );

}

if (overlay) {

  overlay.addEventListener(
    "click",
    fecharModalPix
  );

}

document
  .getElementById("reservar-presente")
  ?.addEventListener(
    "click",
    reservarPresente
  );

document
  .getElementById("somente-pix")
  ?.addEventListener(
    "click",
    mostrarPix
  );

// ============================================================
// Init
// ============================================================

carregarPresentes();