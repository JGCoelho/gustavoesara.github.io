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
const fecharModal = document.getElementById("fechar-modal");
const overlay = document.getElementById("overlay");
const copiarPix = document.getElementById("copiar-pix");

const etapaReserva = document.getElementById("etapa-reserva");
const etapaPix = document.getElementById("etapa-pix");

// ============================================================
// Global State
// ============================================================

let presenteSelecionado = null;

// ============================================================
// Utils
// ============================================================

function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function formatarPreco(valor) {
  const numero = Number(valor);

  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// ============================================================
// Nome PIX (NOVO - CENTRALIZADO)
// ============================================================

function atualizarNomePix(presente) {
  const el = document.getElementById("pix-nome");
  if (!el) return;

  el.textContent = pixAberto?.name || "";
}

// ============================================================
// Modal
// ============================================================

function abrirModal(presente) {
  document.body.classList.add("overflow-hidden");
  presenteSelecionado = presente;

  modal?.classList.remove("hidden");

  if (
    presente.status === "reserved" ||
    presente.status === "paid"
  ) {
    etapaReserva?.classList.add("hidden");
    etapaPix?.classList.remove("hidden");
    mostrarPixSalvo(presente);
    return;
  }

  etapaReserva?.classList.remove("hidden");
  etapaPix?.classList.add("hidden");
}

function fecharModalPix() {
  document.body.classList.remove("overflow-hidden");
  modal?.classList.add("hidden");

  presenteSelecionado = null;
  pixAberto = null; // 🔥 importante

  etapaReserva?.classList.remove("hidden");
  etapaPix?.classList.add("hidden");
}

// ============================================================
// PIX
// ============================================================

function gerarPixDoPresente(presente) {
  const payload = gerarPayloadPix({
    pixKey: "josegustavocoelho@gmail.com",
    description: presente.name,
    merchantName: "GUSTAVO E SARA",
    merchantCity: "GOVVALADARES",
    amount: Number(presente.price),
    txid: `PRESENTE${presente.id}`
  });

  const pixCodeEl = document.getElementById("pix-code");
  const qrContainer = document.getElementById("qrcode");

  if (!pixCodeEl || !qrContainer) return payload;

  pixCodeEl.textContent = payload;

  qrContainer.innerHTML = "";
  new QRCode(qrContainer, {
    text: payload,
    width: 220,
    height: 220
  });

  return payload;
}

function mostrarPix() {
  if (!presenteSelecionado) return;

  etapaReserva?.classList.add("hidden");
  etapaPix?.classList.remove("hidden");

  pixAberto = presenteSelecionado; // 🔥 fixa snapshot correto

  requestAnimationFrame(() => {
    atualizarNomePix(pixAberto);
  });

  gerarPixDoPresente(pixAberto);
}

function mostrarPixSalvo(presente) {
  pixAberto = presente; // 🔥 fixa o contexto correto

  const payload = presente.pix_code;
  if (!payload) return;

  document.getElementById("pix-code").textContent = payload;

  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";

  new QRCode(qrContainer, {
    text: payload,
    width: 220,
    height: 220
  });
}

// ============================================================
// Copiar PIX
// ============================================================

if (copiarPix) {
  copiarPix.addEventListener("click", () => {
    const payload =
      document.getElementById("pix-code")?.textContent;

    if (!payload) return;

    navigator.clipboard.writeText(payload);

    copiarPix.innerText = "Código copiado ✓";

    setTimeout(() => {
      copiarPix.innerText = "Copiar código PIX";
    }, 2000);
  });
}

// ============================================================
// Reservar Presente
// ============================================================

let isReserving = false;

async function reservarPresente() {
  if (!presenteSelecionado) return;

  if (isReserving) return;
  isReserving = true;

  const nome = prompt("Digite seu nome para reservar:");

  if (!nome) {
    isReserving = false;
    return;
  }

  // ========================================================
  // 1. RESERVA PRIMEIRO (SEM PIX)
  // ========================================================
  const { data, error } = await supabaseClient.rpc(
    "reserve_present",
    {
      present_id: presenteSelecionado.id,
      reserver_name: nome,
      pix: null // 🔥 não geramos mais aqui
    }
  );

  if (error) {
    console.error(error);
    alert("Erro ao reservar presente.");
    isReserving = false;
    return;
  }

  if (!data || data.length === 0) {
    alert("Este presente acabou de ser reservado por outra pessoa.");
    await carregarPresentes();
    fecharModalPix();
    isReserving = false;
    return;
  }

  // ========================================================
  // 2. ATUALIZA ESTADO COM DADOS REAIS DO BANCO
  // ========================================================
  const presenteAtualizado = data[0];
  presenteSelecionado = presenteAtualizado;

  // ========================================================
  // 3. GERA PIX SOMENTE APÓS SUCESSO
  // ========================================================
  mostrarPix();

  // ========================================================
  // 4. EMAIL (continua igual)
  // ========================================================
  supabaseClient.functions.invoke(
    "send-reservation-email",
    {
      body: {
        name: presenteAtualizado.name,
        price: presenteAtualizado.price,
        reserved_by: nome
      }
    }
  );

  await carregarPresentes();

  isReserving = false;
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
      pix_code: null
    })
    .eq("status", "reserved")
    .lt("expires_at", new Date().toISOString());
}

// ============================================================
// Carregar Presentes
// ============================================================

async function carregarPresentes() {
  await expirarReservas();

  const { data, error } = await supabaseClient
    .from("presents")
    .select("*")
    .order("id");

  if (error) {
    console.error(error);
    return;
  }

  const grid = document.getElementById("presentes-grid");
  if (!grid) return;

  const cards = data.map((presente) => {
    return `
  <div class="relative bg-[#FFFDF9]/90 rounded-3xl shadow-[0_10px_40px_rgba(107,98,40,0.08)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">

    ${
      presente.status === "paid"
        ? `
         <img
          src="images/pago-stamp.png"
          class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-2/3 object-contain z-20 pointer-events-none"
        />
        `
        : ""
    }

    ${
      presente.image_url
        ? `
          <div class="w-full aspect-[2/1] overflow-hidden">
            <img
              src="${presente.image_url}"
              class="w-full h-full object-cover block transition-transform duration-500 hover:scale-105"
            />
          </div>
        `
        : ""
    }

    <div class="relative z-10 p-8 pt-6">

      <h3 class="text-3xl mb-4">
        ${presente.name || "Sem nome"}
      </h3>

      <p class="mb-6 text-[#7A7340] leading-relaxed text-sm">
        ${presente.description || ""}
      </p>

      <p class="text-2xl font-semibold mb-5">
        ${formatarPreco(presente.price || 0)}
      </p>

      ${
        presente.status === "reserved"
          ? `
            <p class="text-sm text-[#7A7340] mb-5 texto-negrito">
              Presente reservado por
              <b><span class="font-big text-red-800" >
                ${escaparHTML(presente.reserved_by || "")}
              </span></b>
            </p>
          `
          : ""
      }

      ${
        presente.status === "paid"
          ? `
            <div class="w-full border border-[#6B6228] text-[#6B6228] py-3 rounded-xl text-center bg-[#F7F0E8] text-sm texto-negrito">
              Presenteado por
              <span class="texto-negrito">
                ${escaparHTML(presente.reserved_by || "")}
              </span>
            </div>
          `
          : `
            <button
              class="abrir-modal w-full ${
                presente.status === "reserved"
                  ? "bg-yellow-700 hover:bg-yellow-800"
                  : "bg-[#6B6228] hover:bg-[#5A5322]"
              } text-white py-3 rounded-xl transition text-sm"
              data-id="${presente.id}"
            >
              ${
                presente.status === "reserved"
                  ? "Ver PIX"
                  : "Presentear"
              }
            </button>
          `
      }

    </div>
  </div>
  `;
  }).join("");

  grid.innerHTML = cards;

  document.querySelectorAll(".abrir-modal").forEach((botao) => {
    botao.addEventListener("click", () => {
      const id = botao.dataset.id;
      const presente = data.find((p) => p.id == id);
      abrirModal(presente);
    });
  });
}

// ============================================================
// Event Listeners
// ============================================================

fecharModal?.addEventListener("click", fecharModalPix);
overlay?.addEventListener("click", fecharModalPix);

document
  .getElementById("cancelar-modal")
  ?.addEventListener("click", fecharModalPix);

document
  .getElementById("reservar-presente")
  ?.addEventListener("click", reservarPresente);

// ============================================================
// Init
// ============================================================

carregarPresentes();