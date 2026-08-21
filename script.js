/* =========================================================
   NorthTrip — интерактив лендинга
   ========================================================= */
(function () {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Блокировка прокрутки фона (работает и в iOS Safari) ---------- */
  let lockedY = 0;
  let locks = 0;
  const lockScroll = () => {
    if (locks++) return;
    lockedY = window.scrollY;
    document.body.style.top = `-${lockedY}px`;
    document.body.classList.add('is-locked');
  };
  const unlockScroll = () => {
    if (locks === 0 || --locks) return;
    const html = document.documentElement;
    const behavior = html.style.scrollBehavior;
    document.body.classList.remove('is-locked');
    document.body.style.top = '';
    html.style.scrollBehavior = 'auto';       // иначе smooth-scroll «доедет» рывком
    window.scrollTo(0, lockedY);
    html.style.scrollBehavior = behavior;
  };

  /* ---------- Фокус: список интерактивных элементов и цикл по ним ---------- */
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
                    'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const focusables = root => $$(FOCUSABLE, root)
    .filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  // Замыкаем Tab/Shift+Tab внутри открытой модалки
  const trapFocus = (e, root) => {
    if (e.key !== 'Tab') return;
    const items = focusables(root);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const outside = !root.contains(active);
    if (e.shiftKey && (outside || active === first)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (outside || active === last)) { e.preventDefault(); first.focus(); }
  };

  /* ---------- Адаптивные картинки в модалках ----------
     Наборы avif/webp уже описаны в разметке (см. tools/build-images.py),
     поэтому модалка и лайтбокс копируют srcset из <picture> нужной карточки,
     а не собирают пути заново. */
  const copyPicture = (from, avif, webp, sizes) => {
    if (!from) return;
    avif.srcset = $('source[type="image/avif"]', from).srcset;
    webp.srcset = $('source[type="image/webp"]', from).srcset;
    avif.sizes = webp.sizes = sizes;
  };

  /* ---------- Данные туров для модального окна ---------- */
  const TOURS = {
    norway: {
      tag: 'Север · средняя нагрузка',
      title: 'Норвегия · Лофотены и фьорды',
      img: 'images/tour-1.jpg',
      alt: 'Норвежские фьорды',
      price: '189 900 ₽',
      facts: ['8 дней / 7 ночей', '12–19 октября 2026', 'Группа до 12 человек', 'Берген — Лофотены'],
      lead: 'Маршрут для тех, кто хочет увидеть север без спешки: две базы вместо ежедневных переездов, много воды, света и тишины.',
      plan: [
        'Прилёт в Берген, прогулка по Брюггену и ужин с местной кухней.',
        'Круиз по Согне-фьорду, ночёвка в деревне на берегу.',
        'Перелёт на Лофотены, заселение в рыбацкие домики рорбу.',
        'Пеший день: подъём на Рейнебринген и деревня Рейне.',
        'Морская прогулка по Тролль-фьорду, вечерняя охота за сиянием.',
        'Свободный день: велосипеды, каяки или отдых у воды.',
        'Пляж Хауклан, маяки, прощальный ужин с местным гидом.',
        'Возвращение в Берген и вылет домой.'
      ]
    },
    iceland: {
      tag: 'Север · для активных',
      title: 'Исландия · Огонь и лёд',
      img: 'images/tour-2.jpg',
      alt: 'Исландские ландшафты',
      price: '214 500 ₽',
      facts: ['7 дней / 6 ночей', '3–9 ноября 2026', 'Группа до 10 человек', 'Юг острова'],
      lead: 'Ноябрь — лучшее сочетание доступных дорог и тёмных ночей: и водопады, и реальные шансы на сияние.',
      plan: [
        'Рейкьявик: старый порт, обед из свежего улова, знакомство с группой.',
        'Золотое кольцо: гейзеры, Гюдльфосс и разлом тектонических плит.',
        'Южный берег: водопады Сельяландсфосс и Скоугафосс, чёрный пляж Рейнисфьяра.',
        'Ледниковая лагуна Йёкюльсаурлоун и Алмазный пляж.',
        'Прогулка по леднику с инструктором и снаряжением.',
        'Полуостров Снайфедльснес, горячие источники под открытым небом.',
        'Свободное утро в Рейкьявике и вылет.'
      ]
    },
    italy: {
      tag: 'Города · спокойный темп',
      title: 'Италия · Рим, Флоренция, Тоскана',
      img: 'images/tour-3.jpg',
      alt: 'Итальянский город на закате',
      price: '164 000 ₽',
      facts: ['9 дней / 8 ночей', '5–13 сентября 2026', 'Группа до 12 человек', '3 города + винодельни'],
      lead: 'Классика без беготни: мы заходим в музеи до открытия основного потока и оставляем время на кофе и разговоры.',
      plan: [
        'Рим: заселение, вечерняя прогулка по Трастевере.',
        'Ранний Колизей и Форум, свободный день после обеда.',
        'Ватикан с гидом-искусствоведом, вечер на площади Навона.',
        'Переезд во Флоренцию, панорама с площади Микеланджело.',
        'Уффици, мастерская кожевника, ужин у флорентийского шефа.',
        'Тоскана: Сан-Джиминьяно и дегустация в семейном хозяйстве.',
        'Валь-д’Орча: кипарисовые дороги и термальные источники.',
        'Сиена, свободный вечер во Флоренции.',
        'Вылет из Флоренции или Рима.'
      ]
    },
    portugal: {
      tag: 'Побережье · лёгкая нагрузка',
      title: 'Португалия · Лиссабон и океан',
      img: 'images/tour-4.jpg',
      alt: 'Побережье Португалии',
      price: '148 700 ₽',
      facts: ['8 дней / 7 ночей', '20–27 сентября 2026', 'Группа до 12 человек', 'Лиссабон — Алгарве'],
      lead: 'Мягкий сентябрь, тёплый океан и маршрут, в котором город плавно перетекает в побережье.',
      plan: [
        'Лиссабон: Алфама, смотровые площадки, ужин с фаду.',
        'Белен, музей карет и дегустация паштел-де-ната.',
        'Синтра и мыс Рока — самая западная точка Европы.',
        'Урок серфинга в Кашкайше для любого уровня.',
        'Переезд в Алгарве, вечер на скалах Понта-да-Пьедаде.',
        'Морская прогулка по гротам Бенагил.',
        'Свободный день: океан, велосипеды или спа.',
        'Возвращение в Лиссабон и вылет.'
      ]
    },
    swiss: {
      tag: 'Горы · зимние даты',
      title: 'Швейцария · Альпы и панорамные поезда',
      img: 'images/tour-5.jpg',
      alt: 'Швейцарские Альпы',
      price: '197 300 ₽',
      facts: ['6 дней / 5 ночей', '14–19 декабря 2026', 'Группа до 10 человек', 'Церматт — Гриндельвальд'],
      lead: 'Короткий, но плотный маршрут по двум главным альпийским долинам — с поездами, у которых окна во всю стену.',
      plan: [
        'Цюрих — Люцерн: старый мост, набережная, ужин в городе.',
        'Ледниковый экспресс до Церматта сквозь перевалы.',
        'Подъём к Маттерхорну, свободное время на склонах.',
        'Переезд в Гриндельвальд, вечер в шале с сырным фондю.',
        'Юнгфрауйох — «вершина Европы» и прогулка по долине.',
        'Берн и вылет из Цюриха.'
      ]
    },
    scotland: {
      tag: 'Горы · малая группа',
      title: 'Шотландия · Хайленд и замки',
      img: 'images/tour-6.jpg',
      alt: 'Шотландский Хайленд',
      price: '172 400 ₽',
      facts: ['7 дней / 6 ночей', '1–7 октября 2026', 'Группа до 8 человек', 'Эдинбург — остров Скай'],
      lead: 'Октябрь красит Хайленд в рыжий: лучшее время для видов, троп и вечеров у камина.',
      plan: [
        'Эдинбург: Королевская миля, замок, паб с живой музыкой.',
        'Замок Стерлинг и озеро Лох-Ломонд.',
        'Долина Гленко: пешая тропа и остановки для съёмки.',
        'Переезд на остров Скай, Старик Сторр на закате.',
        'Скай: Килт-Рок, Фейри-Пулс, ночь в историческом поместье.',
        'Лох-Несс и дегустация на семейной вискикурне.',
        'Возвращение в Эдинбург и вылет.'
      ]
    }
  };

  /* ---------- Хедер: фон при скролле + активный пункт меню ---------- */
  const header = $('#header');
  const nav = $('#nav');
  const burger = $('#burger');
  const headerH = () => header.offsetHeight;

  const onScroll = () => {
    header.classList.toggle('is-stuck', window.scrollY > 40);
    $('#toTop').classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.8);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav a[href^="#"]');
  const sections = navLinks
    .map(a => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.classList.toggle(
          'is-current', a.getAttribute('href') === '#' + entry.target.id
        ));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));
  }

  /* ---------- Мобильное меню ---------- */
  const navScrim = $('#navScrim');
  let menuOpen = false;
  const closeMenu = () => {
    nav.classList.remove('is-open');
    navScrim.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    if (menuOpen) { menuOpen = false; unlockScroll(); }
  };
  burger.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    navScrim.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open !== menuOpen) { menuOpen = open; open ? lockScroll() : unlockScroll(); }
  });
  // Тап по затемнению — закрыть меню (плюс общий клик мимо меню)
  navScrim.addEventListener('click', closeMenu);
  // При повороте экрана / переходе на десктоп off-canvas исчезает — снимаем блокировку скролла
  window.matchMedia('(min-width: 901px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  document.addEventListener('click', e => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target) && !burger.contains(e.target)) closeMenu();
  });

  /* ---------- Плавная прокрутка с учётом фиксированной шапки ---------- */
  const scrollToEl = el => {
    const top = el.getBoundingClientRect().top + window.scrollY - headerH() - 12;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target);
      // pushState, а не replaceState: кнопка «назад» возвращает к предыдущему якорю
      if (id !== location.hash) history.pushState(null, '', id);
    });
  });

  // «Назад»/«вперёд» браузера прокручивают к нужной секции
  window.addEventListener('popstate', () => {
    const id = location.hash;
    const target = id.length > 1 ? document.querySelector(id) : null;
    if (target) scrollToEl(target);
    else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* ---------- Появление блоков при скролле ---------- */
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => entry.target.classList.add('is-visible'), i * 70);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealItems.forEach(el => io.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add('is-visible'));
  }

  /* ---------- Счётчики (hero + «Почему мы») ---------- */
  const counters = $$('[data-count]');
  const runCounter = el => {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const format = v => (decimals
      ? v.toFixed(decimals).replace('.', ',')
      : Math.round(v).toLocaleString('ru-RU')) + suffix;

    if (reduceMotion) { el.textContent = format(target); return; }
    const step = now => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = format(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(el => co.observe(el));
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Фильтр туров ---------- */
  const chips = $$('.chip');
  const tours = $$('.tour');
  const emptyMsg = $('#toursEmpty');

  const applyFilter = value => {
    let shown = 0;
    tours.forEach(card => {
      const match = value === 'all' || card.dataset.cat.split(' ').includes(value);
      card.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    emptyMsg.hidden = shown !== 0;
    const label = $('.chip[data-filter="' + value + '"]');
    $('#tourStatus').textContent = shown
      ? `Фильтр «${label ? label.textContent : value}»: показано туров — ${shown}`
      : `Фильтр «${label ? label.textContent : value}»: подходящих дат нет`;
    chips.forEach(c => {
      const active = c.dataset.filter === value;
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-pressed', String(active));
    });
  };
  chips.forEach(chip => chip.addEventListener('click', () => applyFilter(chip.dataset.filter)));

  // Клик по направлению — фильтруем туры и переходим к ним
  $$('.dir-card').forEach(card => {
    const title = $('h3', card).textContent;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Показать туры: ${title}`);

    const go = () => {
      applyFilter(card.dataset.filter);
      const top = $('#tours').getBoundingClientRect().top + window.scrollY - headerH() - 12;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    card.addEventListener('click', go);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });

  /* ---------- Модальное окно тура ---------- */
  const modal = $('#modal');
  let lastFocused = null;

  const openModal = id => {
    const data = TOURS[id];
    if (!data) return;
    lastFocused = document.activeElement;

    copyPicture($(`.tour[data-id="${id}"] picture`), $('#modalAvif'), $('#modalWebp'),
                '(max-width: 900px) 92vw, 440px');
    $('#modalImg').src = data.img;
    $('#modalImg').alt = data.alt;
    $('#modalTag').textContent = data.tag;
    $('#modalTitle').textContent = data.title;
    $('#modalLead').textContent = data.lead;
    $('#modalPrice').textContent = data.price;
    $('#modalFacts').innerHTML = data.facts.map(f => `<li>${f}</li>`).join('');
    $('#modalPlan').innerHTML = data.plan.map(d => `<li>${d}</li>`).join('');
    $('#modalCta').dataset.id = id;

    modal.hidden = false;
    lockScroll();
    $('.modal__close', modal).focus();
  };

  const closeModal = () => {
    modal.hidden = true;
    unlockScroll();
    if (lastFocused) lastFocused.focus();
  };

  $$('.js-more').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
  $$('[data-close]', modal).forEach(el => el.addEventListener('click', closeModal));

  $('#modalCta').addEventListener('click', function () {
    const id = this.dataset.id;
    closeModal();
    const select = $('#direction');
    if (select && [...select.options].some(o => o.value === id)) select.value = id;
    const top = $('#form').getBoundingClientRect().top + window.scrollY - headerH() - 12;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    setTimeout(() => $('#name').focus({ preventScroll: true }), reduceMotion ? 0 : 700);
  });

  /* ---------- Галерея: лайтбокс ---------- */
  const galItems = $$('.gal-item');
  const lightbox = $('#lightbox');
  const lbImg = $('#lbImg');
  const lbCaption = $('#lbCaption');
  let lbIndex = 0;

  const showPhoto = i => {
    lbIndex = (i + galItems.length) % galItems.length;
    const item = galItems[lbIndex];
    copyPicture($('picture', item), $('#lbAvif'), $('#lbWebp'), '92vw');
    lbImg.src = item.dataset.full;
    lbImg.alt = $('img', item).alt;
    lbCaption.textContent = item.dataset.caption;
  };
  const openLightbox = i => {
    lastFocused = document.activeElement;
    showPhoto(i);
    lightbox.hidden = false;
    lockScroll();
    $('[data-lb-close]', lightbox).focus();
  };
  const closeLightbox = () => {
    lightbox.hidden = true;
    unlockScroll();
    if (lastFocused) lastFocused.focus();
  };

  galItems.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)));
  $('[data-lb-close]').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => showPhoto(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => showPhoto(lbIndex + 1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  /* ---------- Клавиатура для модалок ---------- */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!modal.hidden) closeModal();
      else if (!lightbox.hidden) closeLightbox();
      else if (nav.classList.contains('is-open')) closeMenu();
      return;
    }
    // Пока модалка открыта, Tab не должен уходить на фон
    if (!modal.hidden) { trapFocus(e, $('.modal__dialog', modal)); return; }
    if (!lightbox.hidden) {
      trapFocus(e, lightbox);
      if (e.key === 'ArrowLeft') showPhoto(lbIndex - 1);
      if (e.key === 'ArrowRight') showPhoto(lbIndex + 1);
    }
  });

  /* ---------- Слайдер отзывов ---------- */
  const track = $('#sliderTrack');
  const slides = $$('.review', track);
  const dotsBox = $('#sliderDots');
  let current = 0;
  let timer = null;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Отзыв ${i + 1}`);
    dot.addEventListener('click', () => goTo(i, true));
    dotsBox.appendChild(dot);
  });
  const dots = $$('button', dotsBox);

  function goTo(i, stop) {
    current = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === current);
      if (k === current) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
    if (stop) restart();
  }
  const restart = () => {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => goTo(current + 1), 7000);
  };

  $('#prevSlide').addEventListener('click', () => goTo(current - 1, true));
  $('#nextSlide').addEventListener('click', () => goTo(current + 1, true));

  const slider = $('#slider');
  slider.addEventListener('mouseenter', () => clearInterval(timer));
  slider.addEventListener('mouseleave', restart);

  // Свайп на тач-устройствах
  let touchX = null;
  let touchY = null;
  slider.addEventListener('touchstart', e => {
    touchX = e.changedTouches[0].clientX;
    touchY = e.changedTouches[0].clientY;
  }, { passive: true });
  slider.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    // жест засчитываем только если он горизонтальный, иначе это скролл страницы
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      goTo(current + (dx < 0 ? 1 : -1), true);
    }
    touchX = touchY = null;
  }, { passive: true });

  goTo(0);
  restart();

  /* ---------- FAQ: одновременно открыт один вопрос ---------- */
  const faqItems = $$('.faq__item');
  faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach(other => { if (other !== item) other.open = false; });
    });
  });

  /* ---------- Форма подбора тура ---------- */
  const form = $('#leadForm');
  const phone = $('#phone');

  // Ближайший доступный месяц — текущий, без хардкода в разметке
  const monthField = $('#month');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  monthField.min = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  monthField.max = `${now.getFullYear() + 2}-12`;

  // Маска телефона: +7 (999) 123-45-67
  // Работаем с 10 «национальными» цифрами: код страны (+7 / 7 / 8) срезаем,
  // чтобы вставка «89211234567» поверх префикса «+7 (» не теряла последнюю цифру.
  const phoneDigits = raw => {
    const str = String(raw);
    let d = str.replace(/\D/g, '');
    if (/^\s*\+7/.test(str)) d = d.slice(1);                   // «+7» из маски — код страны
    while (d.length > 10 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    if (d.length === 11 && (d[0] === '7' || d[0] === '8')) d = d.slice(1);
    return d.slice(0, 10);
  };
  const phoneFormat = d => {
    let out = '+7';
    if (d.length) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ') ' + d.slice(3, 6);
    if (d.length >= 6) out += '-' + d.slice(6, 8);
    if (d.length >= 8) out += '-' + d.slice(8, 10);
    return out;
  };
  // Позиция каретки после n-й национальной цифры (префикс «+7» пропускаем)
  const caretAfterDigit = (value, n) => {
    if (n <= 0) return value.length;
    let seen = 0;
    for (let i = 2; i < value.length; i++) {
      if (/\d/.test(value[i]) && ++seen === n) return i + 1;
    }
    return value.length;
  };

  phone.addEventListener('input', () => {
    const before = phone.value;
    const pos = phone.selectionStart == null ? before.length : phone.selectionStart;
    const atEnd = pos >= before.length;
    let typed = (before.slice(0, pos).match(/\d/g) || []).length;
    if (before.startsWith('+7')) typed -= 1;                 // код страны не в счёт

    const digits = phoneDigits(before);
    phone.value = phoneFormat(digits);
    if (!atEnd) {
      const caret = caretAfterDigit(phone.value, Math.min(typed, digits.length));
      phone.setSelectionRange(caret, caret);
    }
  });

  // Backspace на разделителе должен стирать предыдущую цифру, а не упираться в маску
  phone.addEventListener('keydown', e => {
    if (e.key !== 'Backspace') return;
    const { selectionStart: from, selectionEnd: to, value } = phone;
    if (from !== to || from === 0 || /\d/.test(value[from - 1])) return;
    let i = from - 1;
    while (i >= 0 && !/\d/.test(value[i])) i--;
    if (i < 2) return;                                        // «+7» не трогаем
    e.preventDefault();
    phone.value = value.slice(0, i) + value.slice(i + 1);
    phone.setSelectionRange(i, i);
    phone.dispatchEvent(new Event('input'));
  });

  phone.addEventListener('focus', () => { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('blur', () => { if (!phoneDigits(phone.value).length) phone.value = ''; });

  const setError = (field, message) => {
    const box = field.closest('.field') || field.closest('.checkbox');
    const errEl = $(`[data-error="${field.name}"]`, form);
    if (box) box.classList.toggle('has-error', Boolean(message));
    if (errEl) {
      errEl.textContent = message || '';
      errEl.classList.toggle('is-shown', Boolean(message));
    }
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  };

  const validators = {
    name: v => (v.trim().length >= 2 ? '' : 'Напишите, как к вам обращаться'),
    phone: v => (phoneDigits(v).length === 10 ? '' : 'Введите номер полностью'),
    email: v => (!v.trim() || /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(v.trim()) ? '' : 'Проверьте адрес почты')
  };

  ['name', 'phone', 'email'].forEach(id => {
    const field = $('#' + id);
    field.addEventListener('blur', () => setError(field, validators[id](field.value)));
    field.addEventListener('input', () => {
      if ((field.closest('.field') || {}).classList?.contains('has-error')) {
        setError(field, validators[id](field.value));
      }
    });
  });

  const agree = $('#agree');
  agree.addEventListener('change', () => setError(agree, agree.checked ? '' : 'Без согласия мы не сможем ответить'));

  form.addEventListener('submit', e => {
    e.preventDefault();

    let firstInvalid = null;
    ['name', 'phone', 'email'].forEach(id => {
      const field = $('#' + id);
      const msg = validators[id](field.value);
      setError(field, msg);
      if (msg && !firstInvalid) firstInvalid = field;
    });
    if (!agree.checked) {
      setError(agree, 'Без согласия мы не сможем ответить');
      if (!firstInvalid) firstInvalid = agree;
    } else {
      setError(agree, '');
    }

    if (firstInvalid) {
      firstInvalid.focus({ preventScroll: true });
      firstInvalid.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const btn = $('#submitBtn');
    btn.disabled = true;
    btn.textContent = 'Отправляем…';

    // Здесь будет реальная отправка на сервер / в CRM
    setTimeout(() => {
      console.log('Заявка NorthTrip:', data);
      const dirText = $('#direction').selectedOptions[0].textContent;
      const message = data.direction
        ? `Спасибо, ${data.name.trim()}! Мы получили заявку на «${dirText}» и свяжемся с вами в течение 2 часов.`
        : `Спасибо, ${data.name.trim()}! Куратор свяжется с вами в течение 2 часов и предложит несколько маршрутов.`;

      form.classList.add('is-sent');
      const success = $('#formSuccess');
      success.hidden = false;
      // Текст пишем уже после показа блока — тогда role="status" его озвучит
      $('#successText').textContent = message;
      success.focus({ preventScroll: true });
      btn.disabled = false;
      btn.textContent = 'Подобрать путешествие';
    }, 900);
  });

  $('#resetForm').addEventListener('click', () => {
    form.reset();
    form.classList.remove('is-sent');
    $('#formSuccess').hidden = true;
    $$('.has-error', form).forEach(el => el.classList.remove('has-error'));
    $$('.field__error', form).forEach(el => { el.textContent = ''; el.classList.remove('is-shown'); });
    $('#name').focus();
  });

  /* ---------- Кнопка «наверх» и год в подвале ---------- */
  $('#toTop').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
  $('#year').textContent = new Date().getFullYear();
})();
