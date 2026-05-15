// pix.js

// ======================================================
// Função auxiliar para montar campos EMV
// ======================================================

function emv(id, value) {
  const size = value.length.toString().padStart(2, "0")
  return `${id}${size}${value}`
}

// ======================================================
// CRC16 (obrigatório no PIX)
// ======================================================

function crc16(payload) {
  let polinomio = 0x1021
  let resultado = 0xFFFF

  for (let i = 0; i < payload.length; i++) {
    resultado ^= payload.charCodeAt(i) << 8

    for (let j = 0; j < 8; j++) {
      if ((resultado <<= 1) & 0x10000) {
        resultado ^= polinomio
      }

      resultado &= 0xFFFF
    }
  }

  return resultado.toString(16).toUpperCase().padStart(4, "0")
}

// ======================================================
// Gera payload PIX completo
// ======================================================

function gerarPayloadPix({
  pixKey,
  description = "",
  merchantName,
  merchantCity,
  amount,
  txid = "***"
}) {

  // Payload Format Indicator
  const payloadFormat = emv("00", "01")

  // Merchant Account Information
  const merchantAccount = emv(
    "26",
    emv("00", "BR.GOV.BCB.PIX") +
    emv("01", pixKey)
    )

  // Merchant Category Code
  const merchantCategory = emv("52", "0000")

  // Currency = BRL
  const currency = emv("53", "986")

  // Amount
  const value = emv("54", amount.toFixed(2))

  // Country
  const country = emv("58", "BR")

  // Merchant Name
  const merchant = emv(
    "59",
    merchantName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .substring(0, 25)
  )

  // Merchant City
  const city = emv(
    "60",
    merchantCity
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .substring(0, 15)
  )

  // Additional Data Field Template
  const additionalData = emv(
    "62",
    emv("05", txid)
  )

  // Payload sem CRC
  const payloadSemCRC =
    payloadFormat +
    merchantAccount +
    merchantCategory +
    currency +
    value +
    country +
    merchant +
    city +
    additionalData +
    "6304"

  // CRC16
  const crc = crc16(payloadSemCRC)

  // Payload final
  return payloadSemCRC + crc
}

function mostrarPix() {

  const payload = gerarPayloadPix({
    pixKey: "josegustavocoelho@gmail.com",
    description: presenteSelecionado.name,
    merchantName: "GUSTAVO E SARA",
    merchantCity: "GOVVALADARES",
    amount: presenteSelecionado.price,
    txid: `PRESENTE${presenteSelecionado.id}`
  })

  const qrContainer = document.getElementById("qrcode")

  qrContainer.innerHTML = ""

  new QRCode(qrContainer, {
    text: payload,
    width: 220,
    height: 220
  })

}

// ======================================================
// EXEMPLO
// ======================================================

const payload = gerarPayloadPix({
  pixKey: "josegustavocoelho@gmail.com",
  description: "Air Fryer",
  merchantName: "GUSTAVO E SARA",
  merchantCity: "GOVVALADARES",
  amount: 150.00,
  txid: "PRESENTE001"
})

console.log(payload)

// ======================================================
// QR CODE
// ======================================================

new QRCode(document.getElementById("qrcode"), {
  text: payload,
  width: 220,
  height: 220
})