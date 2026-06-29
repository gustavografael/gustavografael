window.RouteTracer = (() => {
  const ipCache = new Map();

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

  async function lookupHop(ip, lookupIp) {
    if (ipCache.has(ip)) return ipCache.get(ip);

    const details = await lookupIp(ip);
    const org = details.org || (details.asn ? `AS${details.asn}` : "Operador desconhecido");
    const device = window.MacVendor.classifyDevice(org);
    const enriched = {
      org,
      asn: details.asn,
      city: details.city,
      country: details.country_name,
      deviceLabel: device.label,
      deviceType: device.type,
    };

    ipCache.set(ip, enriched);
    return enriched;
  }

  function hopIcon(index, total) {
    if (index === 0) return "💻";
    if (index === total - 1) return "☁️";
    if (index === 1) return "📡";
    return "🛰️";
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

  async function buildPath(traceData, networkState, originIp, lookupIp, isPrivateIpv4) {
    const { probe, hops } = traceData;
    const path = [
      {
        label: "Seu Computador",
        ip: originIp,
        icon: "💻",
        org: "Sua máquina",
        deviceLabel: "Origem local",
        deviceType: "endpoint",
        log: `Pacote saiu da sua máquina (${originIp}).`,
      },
    ];

    const seen = new Set();

    for (let index = 0; index < hops.length; index += 1) {
      const hop = hops[index];
      const ip = hop.resolvedAddress;
      if (!ip || seen.has(ip)) continue;
      seen.add(ip);

      const rtt = hop.timings?.[0]?.rtt ?? null;
      const hostname =
        hop.resolvedHostname && hop.resolvedHostname !== ip ? hop.resolvedHostname : null;
      const isLast = index === hops.length - 1;

      let org = probe.network;
      let deviceLabel = "Equipamento de rede";
      let deviceType = "network";

      try {
        if (isPrivateIpv4(ip)) {
          org = "Gateway / rede local";
          deviceLabel = "Equipamento de rede";
          deviceType = "network";
        } else {
          const details = await lookupHop(ip, lookupIp);
          org = details.org;
          deviceLabel = details.deviceLabel;
          deviceType = details.deviceType;
          await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      } catch {
        org = hostname || "Rede intermediária";
      }

      const label = isLast ? "Destino" : `Salto ${path.length}`;
      const log = hostname
        ? `${label}: ${ip} (${hostname}) — ${org}${rtt != null ? `, ${rtt.toFixed(1)} ms` : ""}.`
        : `${label}: ${ip} — ${org}${rtt != null ? `, ${rtt.toFixed(1)} ms` : ""}.`;

      path.push({
        label,
        ip,
        hostname,
        rtt,
        icon: hopIcon(path.length, hops.length + 1),
        org,
        deviceLabel,
        deviceType,
        log,
      });
    }

    return {
      path,
      probeLabel: `${probe.city}, ${probe.country} (${probe.network})`,
    };
  }

  return {
    traceToDestination,
    buildPath,
  };
})();
