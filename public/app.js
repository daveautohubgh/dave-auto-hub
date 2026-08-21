let cars = [];
let selected = null;

const money = n =>
  n
    ? new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0
      }).format(n)
    : "Price on request";

async function load() {
  try {
    cars = await fetch("/api/cars").then(r => r.json());
    render();
  } catch (error) {
    console.error("Could not load cars:", error);
  }
}

function render() {
  const q = document.getElementById("q").value.toLowerCase();
  const t = document.getElementById("type").value;

  const a = cars.filter(c =>
    (c.name.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)) &&
    (!t || c.type === t)
  );

  document.getElementById("count").textContent =
    `${a.length} vehicle${a.length === 1 ? "" : "s"}`;

  document.getElementById("grid").innerHTML = a.map(c => `
    <article class="card">
      <div class="photo">
        ${c.photo
          ? `<img src="${c.photo}" alt="${c.name}">`
          : "🚘"}
      </div>

      <div class="cardbody">
        <span class="status ${c.status.toLowerCase()}">
          ${c.status}
        </span>

        <h3>${c.name}</h3>

        <div class="meta">
          ${c.year} • ${c.type} •
          ${c.engine || "—"} •
          ${c.transmission || "—"}
        </div>

        <div class="price">${money(c.price_ghs)}</div>

        <button
          type="button"
          class="btn primary"
          onclick="reserve(${c.id})"
        >
          Reserve
        </button>

        <a
          class="btn secondary"
          target="_blank"
          href="https://wa.me/233596294110?text=${encodeURIComponent(
            "Hello Dave Auto Hub, I am interested in " +
            c.name +
            " (" +
            c.year +
            ")."
          )}"
        >
          WhatsApp
        </a>
      </div>
    </article>
  `).join("");
}

function reserve(id) {
  selected = cars.find(c => Number(c.id) === Number(id));

  if (!selected) {
    alert("This vehicle could not be selected. Please refresh and try again.");
    return;
  }

  const modal = document.getElementById("modal");
  const title = document.getElementById("title");

  if (!modal || !title) {
    console.error("Reservation modal or title was not found.");
    alert("Reservation form is not available. Please contact Dave Auto Hub on WhatsApp.");
    return;
  }

  title.textContent = `Reserve ${selected.name} (${selected.year})`;
  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("modal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

const reservationForm = document.getElementById("form");

if (reservationForm) {
  reservationForm.onsubmit = async e => {
    e.preventDefault();

    if (!selected) {
      alert("Please select a vehicle first.");
      return;
    }

    const data = {
      car_id: selected.id,
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      email: document.getElementById("email").value,
      message: document.getElementById("msg").value,
      deposit_ghs: document.getElementById("deposit").value
    };

    try {
      const r = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const x = await r.json();

      if (!r.ok) {
        alert(x.error || "Could not create reservation.");
        return;
      }

      if (x.whatsapp) {
        window.open(x.whatsapp, "_blank");
      }

      alert("Reservation submitted successfully!");
      closeModal();
      reservationForm.reset();

    } catch (error) {
      console.error(error);
      alert("Could not submit reservation. Please check your connection.");
    }
  };
}

document.getElementById("q").oninput = render;
document.getElementById("type").oninput = render;

load();
