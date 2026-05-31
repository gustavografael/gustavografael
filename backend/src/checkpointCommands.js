export const CHECKPOINT_COMMANDS = [
  {
    id: "top",
    label: "Top processes",
    section: "cpu",
    command: "top -b -n 1 | head -20"
  },
  {
    id: "free",
    label: "Memory usage",
    section: "memory",
    command: "free -m"
  },
  {
    id: "loadavg",
    label: "Load average",
    section: "load",
    command: "cat /proc/loadavg"
  },
  {
    id: "mpstat",
    label: "CPU per core",
    section: "cpu",
    command: "mpstat -P ALL 1 3"
  },
  {
    id: "cpview",
    label: "CPView snapshot",
    section: "hardware",
    command: "cpview -s"
  },
  {
    id: "netstat",
    label: "Interface counters",
    section: "interfaces",
    command: "netstat -i"
  },
  {
    id: "ifconfig",
    label: "Interface details",
    section: "interfaceErrors",
    command: "ifconfig"
  },
  {
    id: "fwPstat",
    label: "Firewall performance statistics",
    section: "sessions",
    command: "fw ctl pstat"
  },
  {
    id: "corexlStat",
    label: "CoreXL statistics",
    section: "corexl",
    command: "fw ctl multik stat"
  },
  {
    id: "securexlStat",
    label: "SecureXL status",
    section: "securexl",
    command: "fwaccel stat"
  },
  {
    id: "affinity",
    label: "Core affinity",
    section: "corexl",
    command: "fw ctl affinity -l -a -v"
  },
  {
    id: "messageErrors",
    label: "Recent error logs",
    section: "logs",
    command: "grep -i \"error\" /var/log/messages | tail -50"
  },
  {
    id: "messageFails",
    label: "Recent fail logs",
    section: "logs",
    command: "grep -i \"fail\" /var/log/messages | tail -50"
  },
  {
    id: "coreDumps",
    label: "Usermode core dumps",
    section: "coredumps",
    command: "ls -lh /var/log/dump/usermode/"
  },
  {
    id: "disk",
    label: "Disk usage",
    section: "disk",
    command: "df -h"
  },
  {
    id: "iostat",
    label: "Disk IO statistics",
    section: "disk",
    command: "iostat -xm 1 5"
  },
  {
    id: "clusterStat",
    label: "Cluster state",
    section: "cluster",
    command: "cphaprob stat"
  },
  {
    id: "clusterSync",
    label: "Cluster sync",
    section: "cluster",
    command: "cphaprob syncstat"
  },
  {
    id: "connections",
    label: "Connections table",
    section: "sessions",
    command: "fw tab -t connections -s"
  },
  {
    id: "sensors",
    label: "Hardware sensors",
    section: "hardware",
    command: "cpstat os -f sensors"
  }
];
