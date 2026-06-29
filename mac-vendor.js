const OUI_VENDORS = {
  "00000C": "Cisco Systems",
  "000142": "Cisco Systems",
  "000196": "Cisco Systems",
  "000D29": "Cisco Systems",
  "00163E": "Cisco Systems",
  "001A2F": "Cisco Systems",
  "001AA1": "Cisco Systems",
  "001C7F": "Check Point Software Technologies",
  "001B21": "Intel Corporate",
  "001E65": "Apple",
  "002590": "Super Micro Computer",
  "00264A": "Huawei Technologies",
  "00464B": "Huawei Technologies",
  "00A0C9": "Intel Corporate",
  "00E04C": "Realtek Semiconductor",
  "080027": "PCS Systemtechnik (VirtualBox)",
  "286ED4": "Huawei Technologies",
  "3C5AB4": "Google",
  "005056": "VMware",
  "00155D": "Microsoft",
  "001A11": "Google",
  "F48E38": "Cisco Meraki",
  "7054F5": "Huawei Device",
  "D4F547": "Huawei Technologies",
  "B4A9FC": "Huawei Technologies",
  "001E4F": "Dell",
  "0026B9": "Dell",
  "001A4B": "Dell",
  "000874": "Dell",
  "001871": "Dell",
  "000423": "Intel Corporate",
  "001B77": "Intel Corporate",
  "001F3B": "Juniper Networks",
  "009069": "Juniper Networks",
  "5C5EAB": "Juniper Networks",
  "000585": "Juniper Networks",
  "0019E2": "Juniper Networks",
  "00090F": "Fortinet",
  "000C29": "VMware",
  "525400": "QEMU Virtual NIC",
  "0017C8": "Palo Alto Networks",
  "001C73": "Arista Networks",
  "0010DB": "Juniper Networks",
  "0019E7": "Hewlett Packard",
  "002264": "Hewlett Packard",
  "001CC4": "Hewlett Packard",
  "000883": "Hewlett Packard",
  "001A4D": "Hewlett Packard",
  "000B86": "Aruba Networks",
  "000F24": "Aruba Networks",
  "001A1E": "Aruba Networks",
  "001B0D": "Cisco Systems",
  "001451": "MikroTik",
  "4C5E0C": "Routerboard.com (MikroTik)",
  "D44D77": "MikroTik",
};

const NETWORK_VENDOR_KEYWORDS = [
  "cisco",
  "juniper",
  "huawei",
  "aruba",
  "checkpoint",
  "check point",
  "fortinet",
  "palo alto",
  "mikrotik",
  "arista",
  "extreme",
  "brocade",
  "meraki",
  "routerboard",
];

const ENDPOINT_VENDOR_KEYWORDS = [
  "intel",
  "realtek",
  "apple",
  "dell",
  "hewlett",
  "hp ",
  "lenovo",
  "microsoft",
  "samsung",
  "qualcomm",
  "broadcom",
];

const CLOUD_VENDOR_KEYWORDS = ["google", "amazon", "microsoft azure", "cloudflare"];

const VIRTUAL_VENDOR_KEYWORDS = ["vmware", "virtualbox", "qemu", "hyper-v"];

function normalizeMac(mac) {
  return mac
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "")
    .replace(/(.{2})(?=.)/g, "$1:");
}

function isValidMac(mac) {
  const compact = mac.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  return compact.length === 12 && /^[0-9A-F]{12}$/.test(compact);
}

function extractOui(mac) {
  const compact = mac.trim().toUpperCase().replace(/[^0-9A-F]/g, "");
  return compact.slice(0, 6);
}

function classifyDevice(vendorName) {
  const name = vendorName.toLowerCase();

  if (NETWORK_VENDOR_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return {
      type: "network",
      label: "Equipamento de rede",
      hint: "Switch, roteador, firewall ou appliance de segurança.",
    };
  }

  if (VIRTUAL_VENDOR_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return {
      type: "virtual",
      label: "Interface virtual",
      hint: "Adaptador virtual de VM ou hypervisor.",
    };
  }

  if (CLOUD_VENDOR_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return {
      type: "cloud",
      label: "Servidor / nuvem",
      hint: "Infraestrutura de datacenter ou serviço em nuvem.",
    };
  }

  if (ENDPOINT_VENDOR_KEYWORDS.some((keyword) => name.includes(keyword))) {
    return {
      type: "endpoint",
      label: "Computador / endpoint",
      hint: "Placa de rede típica de PC, notebook ou servidor local.",
    };
  }

  return {
    type: "unknown",
    label: "Fabricante identificado",
    hint: "OUI reconhecido, mas o tipo exato depende do contexto da rede.",
  };
}

function lookupVendor(mac) {
  if (!isValidMac(mac)) {
    return {
      valid: false,
      mac: mac.trim(),
      vendor: null,
      oui: null,
      device: null,
      message: "Formato inválido. Use algo como 00:1A:A1:DD:EE:FF.",
    };
  }

  const normalized = normalizeMac(mac);
  const oui = extractOui(normalized);
  const vendor = OUI_VENDORS[oui] || null;
  const device = vendor ? classifyDevice(vendor) : null;

  if (!vendor) {
    return {
      valid: true,
      mac: normalized,
      oui,
      vendor: null,
      device: null,
      message: `OUI ${oui.slice(0, 2)}:${oui.slice(2, 4)}:${oui.slice(4, 6)} não está na base local. Fabricante desconhecido.`,
    };
  }

  return {
    valid: true,
    mac: normalized,
    oui,
    vendor,
    device,
    message: `${vendor} — ${device.label}. ${device.hint}`,
  };
}

function formatVendorSummary(result) {
  if (!result.valid) return result.message;
  if (!result.vendor) return result.message;
  return `${result.vendor} (${result.device.label})`;
}

window.MacVendor = {
  normalizeMac,
  isValidMac,
  extractOui,
  lookupVendor,
  classifyDevice,
  formatVendorSummary,
};
