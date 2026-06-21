const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#site-nav");

if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
}

document.querySelectorAll("[data-booking-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const button = form.querySelector("button[type='submit']");
    if (button) {
      button.textContent = "Bezig met boeken...";
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "trial_booking_form_submit" });
  });
});

document.querySelectorAll("[data-track='whatsapp_click']").forEach((link) => {
  link.addEventListener("click", () => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "whatsapp_click" });
  });
});

if (location.pathname.endsWith("bedankt.html")) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "thank_you_page_view" });
}
