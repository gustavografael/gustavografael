window.RouteTracer = (() => {
  const ipCache = new Map();

  function computeRttStats(timings = []) {
    const values = timings.map((item) => item.rtt).filter((value) => typeof value === "number");
    if (!values.length) {
      return { min: null, avg: null, max: null, jitter: null };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const jitter = max - min;

    return {
      min,
      avg,
      max,
      jitter,
    };
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some((value) => value == null)) return null;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function parseAsn(value) {
    if (!value) return null;
    const match = String(value).match(/AS(\d+)/i);
    return match ? `AS${match[1]}` : null;
  }

  function normalizeIpLookup(data, ip) {
    const asn = data.asn || parseAsn(data.as);
    return {
      ip,
      org: data.org || data.isp || asn || "Operador desconhecido",
      isp: data.isp || data.org || null,
      asn,
      city: data.city || null,
      region: data.region || data.regionName || null,
      country: data.country_name || data.country || null,
      countryCode: data.country_code || data.countryCode || null,
      latitude: data.latitude ?? data.lat ?? null,
      longitude: data.longitude ?? data.lon ?? null,
      timezone: data.timezone || null,
    };
  }

  async function lookupHopWithFallback(ip, lookupIp, fallbackLookupIp) {
    if (ipCache.has(ip)) return ipCache.get(ip);

    let details = null;

    try {
      details = normalizeIpLookup(await lookupIp(ip), ip);
    } catch {
      try {
        details = normalizeIpLookup(await fallbackLookupIp(ip), ip);
      } catch {
        details = {
          ip,
          org: "Operador desconhecido",
          isp: null,
          asn: null,
          city: null,
          region: null,
          country: null,
          countryCode: null,
          latitude: null,
          longitude: null,
          timezone: null,
        };
      }
    }

    const device = window.MacVendor.classifyDevice(details.org);
    const role = inferHopRole({
      hostname: null,
      org: details.org,
      isGateway: false,
      isDestination: false,
      index: 0,
    });

    const enriched = {
      ...details,
      deviceLabel: device.label,
      deviceType: device.type,
      role: role.label,
      roleHint: role.hint,
    };

    ipCache.set(ip, enriched);
    return enriched;
  }

  function inferHopRole({ hostname, org, isGateway, isDestination, index }) {
    const host = (hostname || "").toLowerCase();
    const vendor = (org || "").toLowerCase();

    if (index === 0) {
      return { label: "Origem local", hint: "Sua máquina na rede local." };
    }

    if (isDestination) {
      return { label: "Destino final", hint: "Servidor ou host de destino." };
    }

    if (isGateway || host.includes("gateway") || host.includes("_gateway")) {
      return { label: "Gateway", hint: "Primeiro roteador após a origem do probe." };
    }

    if (/google|cloudflare|amazon|microsoft|oracle|facebook|meta/.test(vendor)) {
      return { label: "Nuvem / backbone", hint: "Infraestrutura de datacenter ou CDN." };
    }

    if (/telefon|vivo|claro|tim|oi |net |isp|telecom|carrier/.test(vendor)) {
      return { label: "ISP / operadora", hint: "Provedor de acesso ou trânsito." };
    }

    if (/cisco|juniper|huawei|arista|level3|lumen|gtt|tata|ntt/.test(vendor)) {
      return { label: "Backbone", hint: "Rede de transporte entre operadores." };
    }

    return { label: "Roteador intermediário", hint: "Equipamento de encaminhamento na rota." };
  }

  function hopIcon(role, isDestination, index) {
    if (index === 0) return "💻";
    if (isDestination) return "☁️";
    if (role === "Gateway") return "📡";
    if (role === "ISP / operadora") return "📶";
    if (role === "Nuvem / backbone") return "🏢";
    if (role === "Backbone") return "🔗";
    return "🛰️";
  }

  function formatLocation(hop) {
    const parts = [hop.city, hop.region, hop.country].filter(Boolean);
    return parts.length ? parts.join(", ") : "Localização indisponível";
  }

  function formatRtt(stats) {
    if (stats.avg == null) return "RTT indisponível";
    if (stats.min === stats.max) return `${stats.avg.toFixed(1)} ms`;
    return `${stats.min.toFixed(1)} / ${stats.avg.toFixed(1)} / ${stats.max.toFixed(1)} ms`;
  }

  async function pollMeasurement(id, attempts = 25, delayMs = 1000) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await fetch(`https://api.globalping.io/v1/measurements/${id}`);
      if (!response.ok) throw new Error("trace-poll-failed");

      const data = await response.json();
      if (data.status === "finished" || data.status === "failed") return data;
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }

    throw new Error("trace-timeout");
  }

  async function createMeasurement(target, location) {
    const response = await fetch("https://api.globalping.io/v1/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "traceroute",
        target,
        locations: [location],
        limit: 1,
      }),
    });

    if (!response.ok) throw new Error("trace-create-failed");
    return response.json();
  }

  async function traceToDestination(targetIp, networkState, lookupIp, isPrivateIpv4) {
    if (isPrivateIpv4(targetIp)) {
      throw new Error("private-target");
    }

    const location = { country: networkState.countryCode || "BR" };
    if (networkState.city) location.city = networkState.city;

    const created = await createMeasurement(targetIp, location);
    const measurement = await pollMeasurement(created.id);
    const result = measurement.results?.[0];

    if (!result?.result?.hops?.length) {
      throw new Error("trace-empty");
    }

    return {
      probe: result.probe,
      hops: result.result.hops,
      resolvedHostname: result.result.resolvedHostname,
      location,
    };
  }

  async function buildPath(traceData, networkState, originIp, lookupIp, fallbackLookupIp, isPrivateIpv4) {
    const { probe, hops } = traceData;
    let previousLat = probe.latitude ?? networkState.latitude ?? null;
    let previousLon = probe.longitude ?? networkState.longitude ?? null;
    let totalDistanceKm = 0;

    const originRole = inferHopRole({ index: 0 });
    const path = [
      {
        label: "Seu Computador",
        ip: originIp,
        icon: hopIcon(originRole.label, false, 0),
        org: "Sua máquina",
        isp: null,
        asn: null,
        city: networkState.city,
        region: networkState.region,
        country: networkState.countryName,
        countryCode: networkState.countryCode,
        latitude: networkState.latitude,
        longitude: networkState.longitude,
        deviceLabel: "Origem local",
        deviceType: "endpoint",
        role: originRole.label,
        roleHint: originRole.hint,
        rttStats: { min: null, avg: null, max: null, jitter: null },
        distanceKm: 0,
        accumulatedKm: 0,
        log: `Pacote saiu da sua máquina (${originIp}).`,
      },
    ];

    const seen = new Set();

    for (let index = 0; index < hops.length; index += 1) {
      const hop = hops[index];
      const ip = hop.resolvedAddress;
      if (!ip || seen.has(ip)) continue;
      seen.add(ip);

      const hostname =
        hop.resolvedHostname && hop.resolvedHostname !== ip ? hop.resolvedHostname : null;
      const isLast = index === hops.length - 1;
      const rttStats = computeRttStats(hop.timings);
      const isGateway = path.length === 1 || (hostname || "").toLowerCase().includes("gateway");

      let details = {
        org: probe.network,
        isp: probe.network,
        asn: probe.asn ? `AS${probe.asn}` : null,
        city: probe.city,
        region: probe.state,
        country: probe.region,
        countryCode: probe.country,
        latitude: probe.latitude,
        longitude: probe.longitude,
        deviceLabel: "Equipamento de rede",
        deviceType: "network",
      };

      if (isPrivateIpv4(ip)) {
        details.org = "Gateway / rede local";
        details.isp = probe.network;
        details.deviceLabel = "Equipamento de rede";
        details.deviceType = "network";
      } else {
        const enriched = await lookupHopWithFallback(ip, lookupIp, fallbackLookupIp);
        details = { ...details, ...enriched };
        await new Promise((resolve) => window.setTimeout(resolve, 350));
      }

      const role = inferHopRole({
        hostname,
        org: details.org,
        isGateway,
        isDestination: isLast,
        index: path.length,
      });

      const segmentKm = haversineKm(previousLat, previousLon, details.latitude, details.longitude);
      if (segmentKm != null) totalDistanceKm += segmentKm;

      const label = isLast ? "Destino" : `Salto ${path.length}`;
      const locationText = formatLocation(details);
      const rttText = formatRtt(rttStats);

      const log = [
        `${label}: ${ip}`,
        hostname ? `(${hostname})` : null,
        details.asn ? details.asn : null,
        details.org,
        locationText !== "Localização indisponível" ? locationText : null,
        `RTT ${rttText}`,
        segmentKm != null ? `+${segmentKm.toFixed(0)} km` : null,
      ]
        .filter(Boolean)
        .join(" — ");

      path.push({
        label,
        ip,
        hostname,
        icon: hopIcon(role.label, isLast, path.length),
        org: details.org,
        isp: details.isp,
        asn: details.asn,
        city: details.city,
        region: details.region,
        country: details.country,
        countryCode: details.countryCode,
        latitude: details.latitude,
        longitude: details.longitude,
        timezone: details.timezone,
        deviceLabel: details.deviceLabel,
        deviceType: details.deviceType,
        role: role.label,
        roleHint: role.hint,
        rttStats,
        distanceKm: segmentKm,
        accumulatedKm: totalDistanceKm,
        log,
      });

      if (details.latitude != null && details.longitude != null) {
        previousLat = details.latitude;
        previousLon = details.longitude;
      }
    }

    let slowestHopIndex = 0;
    let slowestRtt = -1;
    path.forEach((hop, index) => {
      if (hop.rttStats?.avg != null && hop.rttStats.avg > slowestRtt) {
        slowestRtt = hop.rttStats.avg;
        slowestHopIndex = index;
      }
    });

    path.forEach((hop, index) => {
      hop.isSlowest = index === slowestHopIndex && slowestRtt > 0 && index > 0;
    });

    return {
      path,
      probeLabel: `${probe.city}, ${probe.country} (${probe.network})`,
      probe,
      summary: {
        hopCount: path.length - 1,
        totalDistanceKm,
        slowestHopIndex,
        slowestRtt,
        probeCity: probe.city,
        probeCountry: probe.country,
        probeNetwork: probe.network,
        probeAsn: probe.asn ? `AS${probe.asn}` : null,
      },
    };
  }

  return {
    traceToDestination,
    buildPath,
    formatRtt,
    formatLocation,
    haversineKm,
  };
})();
