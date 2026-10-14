import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import {
  createAuction,
  deleteAuction,
  fetchAuctionById,
  fetchAuctions,
  placeBid,
  uploadAuctionImage,
  updateAuction,
} from './services/auctionService'
import {
  fetchAdminUserDetail,
  fetchAdminUsers,
  clearSession,
  getCurrentUser,
  getStoredSession,
  deleteAdminUser,
  loginUser,
  registerUser,
  saveSession,
  resetAdminUserPassword,
  updateCurrentUser,
} from './services/authService'

const faqItems = [
  {
    question: '¿Cómo puedo participar en una subasta?',
    answer:
      'Para participar necesitas acceder con tu cuenta o registrarte desde la pagina de acceso. Una vez dentro podras pujar en nombre propio en cada producto.',
  },
  {
    question: '¿Se puede comprar directamente sin subasta?',
    answer:
      'No. Esta web esta planteada solo para subastas de productos de segunda mano y no incluye compra directa.',
  },
  {
    question: '¿La plataforma incluye metodo de pago?',
    answer:
      'No. En esta fase del proyecto no se contempla pasarela de pago. El objetivo es centrarse en la publicacion de artículos y en las pujas.',
  },
  {
    question: '¿Quien puede gestionar los productos?',
    answer:
      'El area de administracion esta reservada al personal administrador, que puede crear, retirar o programar productos y subastas.',
  },
  {
    question: '¿Puedo ver el detalle de cada producto?',
    answer:
      'Si. Cada producto cuenta con su propia pagina dedicada donde se muestra la informacion del artículo y el historial de pujas.',
  },
]

const carouselLabels = ['Frontal', 'Lateral', 'Lateral derecho']

const productImageFallbacks = {
  'detalle-apple-watch-ultra': [
    '/productos/apple-watch-ultra/applewatchultra.avif',
    '/productos/apple-watch-ultra/applewatchultra2.avif',
    '/productos/apple-watch-ultra/applewatchultra3.avif',
  ],
  'detalle-iphone-15-pro': [
    '/productos/iphone-15-pro-max/iphone15promax.avif',
    '/productos/iphone-15-pro-max/iphone15promaxlateral.avif',
    '/productos/iphone-15-pro-max/iphone15promaxcamara.avif',
  ],
  'detalle-macbook-air-m2': [
    '/productos/macbook-air-m2/macbookair1.avif',
    '/productos/macbook-air-m2/macbookair2.avif',
    '/productos/macbook-air-m2/macbookair3.avif',
  ],
  'detalle-ipad-air': [
    '/productos/ipad-air-5/ipadair5.avif',
    '/productos/ipad-air-5/ipadair51.avif',
    '/productos/ipad-air-5/ipadair52.avif',
  ],
  'detalle-airpods-max': [
    '/productos/airpods-max/airpodsmax1.avif',
    '/productos/airpods-max/airpodsmax2.avif',
    '/productos/airpods-max/airpodsmax3.avif',
  ],
  'detalle-imac-24': [
    '/productos/imac-24-m1/imac.avif',
    '/productos/imac-24-m1/imac1.avif',
    '/productos/imac-24-m1/imac3.avif',
  ],
}

function buildAuctionCarouselImages(auction) {
  const apiImages = Array.isArray(auction?.images) ? auction.images.filter(Boolean) : []
  const fallbackImages = productImageFallbacks[auction?.id] || []
  const selectedImages = apiImages.length ? apiImages : fallbackImages

  return selectedImages.map((src, index) => ({
    src,
    label: carouselLabels[index] || `Vista ${index + 1}`,
  }))
}

function Header({ session, onLogout }) {
  return (
    <header className="site-header">
      <div className="app-shell topbar">
        <div>
          <Link className="brand" to="/">
            <img className="brand-icon" src="/logotipo-de-apple-white.png" alt="" aria-hidden="true" />
            Apple Auctions
          </Link>
        </div>

        <nav className="topnav" aria-label="Navegacion principal">
          <NavLink to="/">Inicio</NavLink>
          <NavLink to="/subastas">Subastas</NavLink>
          <NavLink to="/faq">FAQ</NavLink>
        </nav>

        <div className="session-pill">
          {session ? (
            <>
              <Link className="session-name-link" to="/perfil">
                {session.user.username}
              </Link>
              <button type="button" className="session-logout-link" onClick={onLogout}>
                (Cerrar Sesión)
              </button>
            </>
          ) : (
            <Link className="secondary-action form-button" to="/acceso">
              Acceso / Registro
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="app-shell footer-inner">
        <div className="footer-block">
          <h3>Contacto</h3>
          <p>Apple Auctions Marketplace S.L.</p>
          <p>Calle Inventada 27, 28042 Madrid</p>
          <p>contacto@appleauctions-demo.es</p>
          <p>+34 910 555 184</p>
        </div>

        <div className="footer-block">
          <h3>Gestión</h3>
          <p>La gestión de artículos se realiza en la página de subastas con Modo edición.</p>
          <Link className="footer-link" to="/subastas">
            Ir a subastas
          </Link>
        </div>
      </div>
    </footer>
  )
}

const initialEditorForm = {
  id: '',
  title: '',
  category: 'General',
  startingPrice: '',
  currentBid: '',
  timeLeft: '',
  status: 'Activa',
  description: '',
  seller: '',
  condition: '',
  extras: '',
  images: ['', '', ''],
}

function AuctionsStatus({ isLoading, error, onRetry, context }) {
  if (isLoading) {
    return <p className="api-status">Cargando subastas desde la API...</p>
  }

  if (!error) {
    return null
  }

  return (
    <div className="api-error-box" role="alert">
      <p>
        No se pudieron cargar las subastas en {context}. {error.message}
      </p>
      <button type="button" className="secondary-action form-button" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

function HomePage({ featuredAuctions, isLoading, error, onRetry }) {
  return (
    <main>
      <section className="hero-section panel" id="inicio">
        <div className="hero-copy">
          <div className="hero-header-row">
            <h1>Compra y vende artículos de segunda mano mediante subastas en tiempo real.</h1>

            <div className="hero-actions">
              <Link className="primary-action" to="/subastas">
                Ver todas las subastas
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="panel featured-panel">
        <div className="panel-heading panel-heading-inline">
          <div>
            <h2>Productos destacados</h2>
          </div>
        </div>

        <AuctionsStatus isLoading={isLoading} error={error} onRetry={onRetry} context="Inicio" />

        {!isLoading && !error ? (
          <div className="card-grid">
            {featuredAuctions.map((auction) => (
              <article className="auction-card" key={auction.id}>
                <span className="card-badge">{auction.status}</span>
                <h3>{auction.title}</h3>
                <p>{auction.category}</p>

                <dl className="auction-meta">
                  <div>
                    <dt>Puja actual</dt>
                    <dd>{auction.currentBid}</dd>
                  </div>
                  <div>
                    <dt>Salida</dt>
                    <dd>{auction.startingPrice}</dd>
                  </div>
                  <div>
                    <dt>Tiempo restante</dt>
                    <dd>{auction.timeLeft}</dd>
                  </div>
                </dl>

                <Link className="card-link" to={`/producto/${auction.id}`}>
                  Ver detalle
                </Link>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}

function AuctionsPage({ auctions, isLoading, error, onRetry, session }) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingAuctionId, setEditingAuctionId] = useState(null)
  const [editorForm, setEditorForm] = useState(initialEditorForm)
  const [editorError, setEditorError] = useState('')
  const [editorSuccess, setEditorSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [uploadReplaceIndex, setUploadReplaceIndex] = useState(null)
  const imagesFileInputRef = useRef(null)

  const isAdmin = session?.user?.role === 'admin'
  const isEditionEnabled = isAdmin && isEditMode

  const onEditorChange = (event) => {
    const { name, value } = event.target
    setEditorForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const onEditorImageChange = (index, value) => {
    setEditorForm((previous) => {
      const images = Array.isArray(previous.images) ? [...previous.images] : []
      images[index] = value
      return {
        ...previous,
        images,
      }
    })
  }

  const addEditorImageField = () => {
    setEditorForm((previous) => ({
      ...previous,
      images: [...(Array.isArray(previous.images) ? previous.images : []), ''],
    }))
  }

  const getUploadFolderHint = () => {
    const candidate = editingAuctionId || editorForm.id || editorForm.title || 'producto'
    return String(candidate)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const uploadImageFiles = async (files, replaceIndex = null) => {
    if (!session?.token) {
      setEditorError('Necesitas sesion de administrador para subir imagenes.')
      return
    }

    const list = Array.from(files || [])
    if (!list.length) {
      return
    }

    const avifFiles = list.filter((file) => file.name.toLowerCase().endsWith('.avif'))
    if (!avifFiles.length) {
      setEditorError('Solo se permiten archivos .avif.')
      return
    }

    setIsUploadingImages(true)
    setEditorError('')

    let nextReplaceIndex = replaceIndex

    try {
      for (const file of avifFiles) {
        const result = await uploadAuctionImage(file, getUploadFolderHint(), session.token)
        const uploadedPath = result?.path

        if (!uploadedPath) {
          throw new Error('La API no devolvio la ruta de la imagen subida.')
        }

        setEditorForm((previous) => {
          const images = Array.isArray(previous.images) ? [...previous.images] : []

          if (nextReplaceIndex != null && nextReplaceIndex >= 0 && nextReplaceIndex < images.length) {
            images[nextReplaceIndex] = uploadedPath
            nextReplaceIndex += 1
          } else {
            images.push(uploadedPath)
          }

          return {
            ...previous,
            images,
          }
        })
      }
    } catch (requestError) {
      setEditorError(requestError.message || 'No se pudieron subir las imagenes.')
    } finally {
      setIsUploadingImages(false)
    }
  }

  const handleImagesFileSelection = async (event) => {
    await uploadImageFiles(event.target.files, uploadReplaceIndex)
    event.target.value = ''
    setUploadReplaceIndex(null)
  }

  const openImagesFilePicker = (replaceIndex = null) => {
    setUploadReplaceIndex(replaceIndex)
    imagesFileInputRef.current?.click()
  }

  const removeEditorImageField = (index) => {
    setEditorForm((previous) => {
      const images = Array.isArray(previous.images) ? [...previous.images] : []
      images.splice(index, 1)
      return {
        ...previous,
        images,
      }
    })
  }

  const resetEditor = () => {
    setEditingAuctionId(null)
    setEditorForm(initialEditorForm)
  }

  const toggleEditionMode = () => {
    setIsEditMode((previous) => !previous)
    setEditorError('')
    setEditorSuccess('')
    resetEditor()
  }

  const beginEditAuction = (auction) => {
    const formImages = buildAuctionCarouselImages(auction).map((image) => image.src)
    const imagesForEditor = formImages.length ? formImages : ['']

    setEditingAuctionId(auction.id)
    setEditorError('')
    setEditorSuccess('')
    setEditorForm({
      id: auction.id,
      title: auction.title,
      category: auction.category,
      startingPrice: auction.startingPrice,
      currentBid: auction.currentBid,
      timeLeft: auction.timeLeft,
      status: auction.status,
      description: auction.description,
      seller: auction.seller,
      condition: auction.condition,
      extras: auction.extras,
      images: imagesForEditor,
    })
  }

  const submitEditor = async (event) => {
    event.preventDefault()

    if (!editorForm.title.trim() || !editorForm.startingPrice.trim() || !editorForm.timeLeft.trim()) {
      setEditorSuccess('')
      setEditorError('Completa al menos nombre, precio de partida y tiempo restante.')
      return
    }

    setIsSaving(true)
    setEditorError('')
    setEditorSuccess('')

    const payload = {
      id: editorForm.id.trim() || undefined,
      title: editorForm.title.trim(),
      category: editorForm.category.trim() || 'General',
      startingPrice: editorForm.startingPrice.trim(),
      currentBid: editorForm.currentBid.trim() || editorForm.startingPrice.trim(),
      timeLeft: editorForm.timeLeft.trim(),
      status: editorForm.status.trim() || 'Activa',
      description: editorForm.description.trim() || 'Sin descripcion',
      seller: editorForm.seller.trim() || 'Administrador',
      condition: editorForm.condition.trim() || 'Pendiente de revision',
      extras: editorForm.extras.trim() || 'Sin extras',
      images: (Array.isArray(editorForm.images) ? editorForm.images : [])
        .map((value) => value.trim())
        .filter(Boolean),
    }

    try {
      if (editingAuctionId) {
        await updateAuction(editingAuctionId, payload, session?.token)
        setEditorSuccess('Artículo actualizado correctamente.')
      } else {
        await createAuction(payload, session?.token)
        setEditorSuccess('Artículo creado correctamente.')
      }

      resetEditor()
      await onRetry()
    } catch (requestError) {
      setEditorError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const removeAuctionInEdition = async (auctionId) => {
    const confirmDelete = window.confirm('¿Seguro que quieres eliminar este artículo?')
    if (!confirmDelete) {
      return
    }

    setIsSaving(true)
    setEditorError('')
    setEditorSuccess('')

    try {
      await deleteAuction(auctionId, session?.token)
      setEditorSuccess('artículo eliminado correctamente.')
      if (editingAuctionId === auctionId) {
        resetEditor()
      }
      await onRetry()
    } catch (requestError) {
      setEditorError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main>
      <section className="panel auctions-page-intro">
        <div className="auctions-page-intro-header">
          <h1>Subastas activas</h1>
          {isAdmin ? (
            <button type="button" className="secondary-action form-button" onClick={toggleEditionMode}>
              {isEditionEnabled ? 'Modo visualizacion' : 'Modo edición'}
            </button>
          ) : null}
        </div>
        <p>Listado general de productos disponibles actualmente para pujar.</p>
      </section>

      <section className="panel auctions-panel auctions-cards-panel">
        <div className="panel-heading panel-heading-inline">
          <div>
            <h2>Catálogo de subastas</h2>
          </div>
        </div>

        <AuctionsStatus isLoading={isLoading} error={error} onRetry={onRetry} context="Subastas" />

        {isEditionEnabled ? (
          <form className="editor-panel" onSubmit={submitEditor}>
            <h3>{editingAuctionId ? 'Editar artículo' : 'Crear artículo'}</h3>

            <div className="editor-grid">
              <label>
                ID (opcional)
                <input
                  type="text"
                  name="id"
                  value={editorForm.id}
                  onChange={onEditorChange}
                  placeholder="mi-articulo-personalizado"
                />
              </label>
              <label>
                Nombre del artículo
                <input
                  type="text"
                  name="title"
                  value={editorForm.title}
                  onChange={onEditorChange}
                  placeholder="Ej. iPhone 14 Pro"
                />
              </label>
              <label>
                Categoria
                <input
                  type="text"
                  name="category"
                  value={editorForm.category}
                  onChange={onEditorChange}
                  placeholder="General"
                />
              </label>
              <label>
                Precio de partida
                <input
                  type="text"
                  name="startingPrice"
                  value={editorForm.startingPrice}
                  onChange={onEditorChange}
                  placeholder="500 EUR"
                />
              </label>
              <label>
                Puja actual (opcional)
                <input
                  type="text"
                  name="currentBid"
                  value={editorForm.currentBid}
                  onChange={onEditorChange}
                  placeholder="520 EUR"
                />
              </label>
              <label>
                Tiempo restante
                <input
                  type="text"
                  name="timeLeft"
                  value={editorForm.timeLeft}
                  onChange={onEditorChange}
                  placeholder="02d 10h"
                />
              </label>
              <label>
                Estado
                <input
                  type="text"
                  name="status"
                  value={editorForm.status}
                  onChange={onEditorChange}
                  placeholder="Activa"
                />
              </label>
              <label>
                Vendedor
                <input
                  type="text"
                  name="seller"
                  value={editorForm.seller}
                  onChange={onEditorChange}
                  placeholder="Equipo Admin"
                />
              </label>
              <label>
                Estado del artículo
                <input
                  type="text"
                  name="condition"
                  value={editorForm.condition}
                  onChange={onEditorChange}
                  placeholder="Muy buen estado"
                />
              </label>
              <label>
                Extras
                <input
                  type="text"
                  name="extras"
                  value={editorForm.extras}
                  onChange={onEditorChange}
                  placeholder="Incluye caja"
                />
              </label>
              <div className="editor-full-row editor-images-group">
                <div className="editor-images-header">
                  <strong>Fotos del producto (.avif)</strong>
                  <div className="editor-images-actions">
                    <button
                      type="button"
                      className="secondary-action form-button small-button"
                      onClick={() => openImagesFilePicker()}
                      disabled={isUploadingImages}
                    >
                      {isUploadingImages ? 'Subiendo...' : 'Subir archivos'}
                    </button>
                    <button
                      type="button"
                      className="secondary-action form-button small-button"
                      onClick={addEditorImageField}
                    >
                      Anadir foto
                    </button>
                  </div>
                </div>

                <input
                  ref={imagesFileInputRef}
                  className="editor-hidden-file-input"
                  type="file"
                  accept=".avif,image/avif"
                  multiple
                  onChange={handleImagesFileSelection}
                />

                {(Array.isArray(editorForm.images) ? editorForm.images : []).map((imagePath, index) => (
                  <div className="editor-image-row" key={`${editingAuctionId || 'new'}-image-field-${index}`}>
                    <label>
                      Foto {index + 1}
                      <input
                        type="text"
                        value={imagePath}
                        onChange={(event) => onEditorImageChange(index, event.target.value)}
                        placeholder="Subir archivo .avif aquí"
                      />
                    </label>

                    <button
                      type="button"
                      className="secondary-action form-button small-button"
                      onClick={() => openImagesFilePicker(index)}
                      disabled={isUploadingImages}
                    >
                      Añadir archivo
                    </button>

                    <button
                      type="button"
                      className="secondary-action form-button danger-action small-button"
                      onClick={() => removeEditorImageField(index)}
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
              <label className="editor-full-row">
                Descripcion
                <input
                  type="text"
                  name="description"
                  value={editorForm.description}
                  onChange={onEditorChange}
                  placeholder="Descripción del artículo"
                />
              </label>
            </div>

            {editorError ? (
              <p className="admin-message admin-message-error" role="alert">
                {editorError}
              </p>
            ) : null}
            {editorSuccess ? <p className="admin-message admin-message-success">{editorSuccess}</p> : null}

            <div className="form-row">
              <button type="submit" className="primary-action form-button" disabled={isSaving}>
                {editingAuctionId ? 'Guardar cambios' : 'Crear artículo'}
              </button>
              <button
                type="button"
                className="secondary-action form-button"
                onClick={resetEditor}
                disabled={isSaving}
              >
                Limpiar formulario
              </button>
            </div>
          </form>
        ) : null}

        {!isLoading && !error ? (
          <div className="card-grid">
            {auctions.map((auction) => (
              <article className="auction-card" key={auction.id}>
                <span className="card-badge">{auction.status}</span>
                <h3>{auction.title}</h3>
                <p>{auction.category}</p>

                <dl className="auction-meta">
                  <div>
                    <dt>Puja actual</dt>
                    <dd>{auction.currentBid}</dd>
                  </div>
                  <div>
                    <dt>Salida</dt>
                    <dd>{auction.startingPrice}</dd>
                  </div>
                  <div>
                    <dt>Tiempo restante</dt>
                    <dd>{auction.timeLeft}</dd>
                  </div>
                </dl>

                <div className="card-actions">
                  <Link className="card-link" to={`/producto/${auction.id}`}>
                    Ver detalle
                  </Link>
                  {isEditionEnabled ? (
                    <>
                      <button
                        type="button"
                        className="primary-action form-button small-button"
                        onClick={() => beginEditAuction(auction)}
                        disabled={isSaving}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="secondary-action form-button danger-action small-button"
                        onClick={() => removeAuctionInEdition(auction.id)}
                        disabled={isSaving}
                      >
                        Eliminar
                      </button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  )
}

function AuthPage({ onAuthSuccess }) {
  const navigate = useNavigate()
  const [loginForm, setLoginForm] = useState({ usernameOrEmail: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  const onLoginChange = (event) => {
    const { name, value } = event.target
    setLoginForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const onRegisterChange = (event) => {
    const { name, value } = event.target
    setRegisterForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    if (!loginForm.usernameOrEmail.trim() || !loginForm.password.trim()) {
      setAuthSuccess('')
      setAuthError('Debes completar usuario/correo y contraseña para iniciar sesion.')
      return
    }

    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccess('')

    try {
      const data = await loginUser({
        username_or_email: loginForm.usernameOrEmail.trim(),
        password: loginForm.password,
      })
      onAuthSuccess(data)
      setLoginForm({ usernameOrEmail: '', password: '' })
      navigate('/', { replace: true })
    } catch (requestError) {
      setAuthError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    if (!registerForm.username.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      setAuthSuccess('')
      setAuthError('Debes completar usuario, correo y contraseña para registrarte.')
      return
    }

    setIsSubmitting(true)
    setAuthError('')
    setAuthSuccess('')

    try {
      await registerUser({
        username: registerForm.username.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
      })
      setAuthSuccess('Usuario creado correctamente. Ya puedes iniciar sesion.')
      setRegisterForm({ username: '', email: '', password: '' })
    } catch (requestError) {
      setAuthError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main>
      <section className="panel auth-page-intro">
        <h1>Accede o crea tu cuenta para pujar.</h1>
        <p>Esta pantalla agrupa el login y el registro fuera de la portada principal.</p>
        <div className="hero-actions">
          <Link className="secondary-action" to="/">
            Volver al inicio
          </Link>
        </div>
      </section>

      <section className="two-column-section">
        <article className="panel auth-panel">
          <div className="panel-heading">
            <h2>Login para compradores y vendedores</h2>
            <p>Formulario visual para que cada usuario puje o gestione anuncios en su nombre.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Usuario o correo electronico
              <input
                type="text"
                name="usernameOrEmail"
                value={loginForm.usernameOrEmail}
                onChange={onLoginChange}
                placeholder="usuario o correo"
              />
            </label>
            <label>
              Contrasena
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={onLoginChange}
                placeholder="Introduce tu contraseña"
              />
            </label>

            <div className="form-row">
              <button type="submit" className="primary-action form-button" disabled={isSubmitting}>
                Iniciar sesion
              </button>
            </div>
          </form>
        </article>

        <article className="panel register-panel">
          <div className="panel-heading">
            <h2>Crear una cuenta nueva</h2>
            <p>Espacio previsto para registrar usuarios antes de participar en subastas.</p>
          </div>

          <form className="auth-form" onSubmit={handleRegister}>
            <label>
              Nombre de usuario
              <input
                type="text"
                name="username"
                value={registerForm.username}
                onChange={onRegisterChange}
                placeholder="Ej. mario"
              />
            </label>
            <label>
              Correo electronico
              <input
                type="email"
                name="email"
                value={registerForm.email}
                onChange={onRegisterChange}
                placeholder="nombre@ejemplo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={onRegisterChange}
                placeholder="Minimo 6 caracteres"
              />
            </label>

            <div className="form-row">
              <button type="submit" className="secondary-action form-button" disabled={isSubmitting}>
                Crear cuenta
              </button>
            </div>
          </form>

          {authError ? (
            <p className="admin-message admin-message-error" role="alert">
              {authError}
            </p>
          ) : null}
          {authSuccess ? <p className="admin-message admin-message-success">{authSuccess}</p> : null}
        </article>
      </section>
    </main>
  )
}

function ProfilePage({ session, onSessionUpdate }) {
  const [profileForm, setProfileForm] = useState({
    username: session?.user?.username || '',
    email: session?.user?.email || '',
    password: '',
  })
  const [profileError, setProfileError] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState('')
  const [selectedAdminUser, setSelectedAdminUser] = useState(null)
  const [selectedAdminUserLoading, setSelectedAdminUserLoading] = useState(false)
  const [selectedAdminUserError, setSelectedAdminUserError] = useState('')
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '' })
  const [resetPasswordError, setResetPasswordError] = useState('')
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('')
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const sessionToken = session?.token
  const sessionUser = session?.user
  const isAdmin = sessionUser?.role === 'admin'

  const handleChange = (event) => {
    const { name, value } = event.target
    setProfileForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  const loadAdminUserDetail = useCallback(async (username, cachedUsers = []) => {
    if (!isAdmin || !sessionToken) {
      return
    }

    setSelectedAdminUserLoading(true)
    setSelectedAdminUserError('')
    setResetPasswordError('')
    setResetPasswordSuccess('')

    try {
      const detail =
        cachedUsers.find((user) => user.username === username) ||
        (await fetchAdminUserDetail(sessionToken, username))
      setSelectedAdminUser(detail)
      setResetPasswordForm({ password: '' })
    } catch (requestError) {
      setSelectedAdminUserError(requestError.message)
    } finally {
      setSelectedAdminUserLoading(false)
    }
  }, [isAdmin, sessionToken])

  const loadAdminUsers = useCallback(async () => {
    if (!isAdmin || !sessionToken) {
      return
    }

    setAdminUsersLoading(true)
    setAdminUsersError('')

    try {
      const users = await fetchAdminUsers(sessionToken)
      setAdminUsers(users)
      if (users.length > 0) {
        await loadAdminUserDetail(users[0].username, users)
      } else {
        setSelectedAdminUser(null)
        setSelectedAdminUserError('')
      }
    } catch (requestError) {
      setAdminUsersError(requestError.message)
    } finally {
      setAdminUsersLoading(false)
    }
  }, [isAdmin, loadAdminUserDetail, sessionToken])

  useEffect(() => {
    if (!isAdmin || !sessionToken) {
      return
    }

    const timerId = setTimeout(() => {
      void loadAdminUsers()
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [isAdmin, loadAdminUsers, sessionToken])

  if (!session) {
    return <Navigate to="/acceso" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!profileForm.username.trim() || !profileForm.email.trim()) {
      setProfileSuccess('')
      setProfileError('El nombre de usuario y el correo son obligatorios.')
      return
    }

    setIsSaving(true)
    setProfileError('')
    setProfileSuccess('')

    try {
      const updatedUser = await updateCurrentUser(sessionToken, {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
        ...(profileForm.password.trim() ? { password: profileForm.password } : {}),
      })

      const newSession = {
        token: sessionToken,
        user: updatedUser,
      }
      onSessionUpdate(newSession)
      setProfileForm({
        username: updatedUser.username || '',
        email: updatedUser.email || '',
        password: '',
      })
      setProfileSuccess('Datos personales actualizados correctamente.')
      if (isAdmin) {
        await loadAdminUsers()
      }
    } catch (requestError) {
      setProfileError(requestError.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectAdminUser = async (username) => {
    setSelectedAdminUser(username)
    await loadAdminUserDetail(username)
  }

  const handleResetPasswordChange = (event) => {
    const { value } = event.target
    setResetPasswordForm({ password: value })
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!selectedAdminUser) {
      setResetPasswordError('Selecciona un usuario primero.')
      return
    }

    if (!resetPasswordForm.password.trim()) {
      setResetPasswordError('Escribe la nueva contraseña que quieres establecer.')
      return
    }

    setIsResettingPassword(true)
    setResetPasswordError('')
    setResetPasswordSuccess('')

    try {
      await resetAdminUserPassword(sessionToken, selectedAdminUser.username, {
        password: resetPasswordForm.password,
      })
      setResetPasswordSuccess('La contraseña se ha restablecido correctamente.')
      setResetPasswordForm({ password: '' })
    } catch (requestError) {
      setResetPasswordError(requestError.message)
    } finally {
      setIsResettingPassword(false)
    }
  }

  const handleDeleteAdminUser = async () => {
    if (!selectedAdminUser) {
      setSelectedAdminUserError('Selecciona un usuario primero.')
      return
    }

    const confirmed = window.confirm(
      `Vas a eliminar a ${selectedAdminUser.username}. Esta accion no se puede deshacer.`
    )
    if (!confirmed) {
      return
    }

    setSelectedAdminUserError('')
    setResetPasswordError('')
    setResetPasswordSuccess('')

    try {
      await deleteAdminUser(sessionToken, selectedAdminUser.username)
      setSelectedAdminUser(null)
      setResetPasswordForm({ password: '' })
      await loadAdminUsers()
    } catch (requestError) {
      setSelectedAdminUserError(requestError.message)
    }
  }

  return (
    <main>
      <section className="panel auth-page-intro">
        <h1>Mi perfil</h1>
        <p>Desde aqui puedes ver y editar tus datos personales.</p>
        <div className="hero-actions">
          <Link className="secondary-action" to="/">
            Volver al inicio
          </Link>
        </div>
      </section>

      <section className="panel profile-panel">
        <div className="panel-heading">
          <h2>Editar información personal</h2>
          <p>Actualiza tu nombre de usuario, correo o contrasena.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Nombre de usuario
            <input
              type="text"
              name="username"
              value={profileForm.username}
              onChange={handleChange}
              placeholder="Tu usuario"
            />
          </label>
          <label>
            Correo electronico
            <input
              type="email"
              name="email"
              value={profileForm.email}
              onChange={handleChange}
              placeholder="tu@email.com"
            />
          </label>
          <label>
            Nueva contrasena
            <input
              type="password"
              name="password"
              value={profileForm.password}
              onChange={handleChange}
              placeholder="Dejar vacio si no cambias la contrasena"
            />
          </label>

          {profileError ? (
            <p className="admin-message admin-message-error" role="alert">
              {profileError}
            </p>
          ) : null}
          {profileSuccess ? <p className="admin-message admin-message-success">{profileSuccess}</p> : null}

          <div className="form-row">
            <button type="submit" className="primary-action form-button" disabled={isSaving}>
              Guardar cambios
            </button>
          </div>
        </form>
      </section>

      {isAdmin ? (
        <section className="panel profile-admin-panel">
          <div className="panel-heading">
            <h2>Gestion de usuarios</h2>
            <p>Consulta los usuarios registrados, revisa su detalle y resetea contraseñas cuando sea necesario.</p>
          </div>

          <div className="admin-users-layout">
            <aside className="admin-users-list">
              <h3>Usuarios registrados</h3>

              {adminUsersLoading ? <p className="api-status">Cargando usuarios...</p> : null}
              {adminUsersError ? (
                <p className="admin-message admin-message-error" role="alert">
                  {adminUsersError}
                </p>
              ) : null}

              <div className="admin-users-grid">
                {adminUsers.map((user) => (
                  <button
                    key={user.username}
                    type="button"
                    className={`admin-user-card ${selectedAdminUser?.username === user.username ? 'admin-user-card-active' : ''}`}
                    onClick={() => handleSelectAdminUser(user.username)}
                  >
                    <strong>{user.username}</strong>
                    <span>{user.email}</span>
                    <small>{user.role}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="admin-user-detail">
              <h3>Detalle del usuario</h3>

              {selectedAdminUserLoading ? <p className="api-status">Cargando detalle...</p> : null}
              {selectedAdminUserError ? (
                <p className="admin-message admin-message-error" role="alert">
                  {selectedAdminUserError}
                </p>
              ) : null}

              {selectedAdminUser ? (
                <div className="detail-card">
                  <p><strong>Usuario:</strong> {selectedAdminUser.username}</p>
                  <p><strong>Correo:</strong> {selectedAdminUser.email}</p>
                  <p><strong>Rol:</strong> {selectedAdminUser.role}</p>
                  {selectedAdminUser.createdAt ? (
                    <p><strong>Creado:</strong> {selectedAdminUser.createdAt}</p>
                  ) : null}
                </div>
              ) : (
                <p className="api-status">Selecciona un usuario para ver su detalle.</p>
              )}

              <form className="auth-form" onSubmit={handleResetPassword}>
                <label>
                  Nueva contraseña para {selectedAdminUser?.username || 'el usuario seleccionado'}
                  <input
                    type="password"
                    value={resetPasswordForm.password}
                    onChange={handleResetPasswordChange}
                    placeholder="Establecer nueva contraseña"
                  />
                </label>

                {resetPasswordError ? (
                  <p className="admin-message admin-message-error" role="alert">
                    {resetPasswordError}
                  </p>
                ) : null}
                {resetPasswordSuccess ? (
                  <p className="admin-message admin-message-success">{resetPasswordSuccess}</p>
                ) : null}

                <div className="form-row">
                  <button type="submit" className="primary-action form-button" disabled={isResettingPassword}>
                    Restablecer contraseña
                  </button>
                  {selectedAdminUser ? (
                    <button
                      type="button"
                      className="secondary-action form-button danger-action"
                      onClick={handleDeleteAdminUser}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </form>
            </section>
          </div>
        </section>
      ) : null}
    </main>
  )
}

function DetailPage({ session }) {
  const { productId } = useParams()
  const [selectedAuction, setSelectedAuction] = useState(null)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bidValue, setBidValue] = useState('')
  const [bidError, setBidError] = useState('')
  const [bidSuccess, setBidSuccess] = useState('')
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const currentBidAmount = useMemo(() => parseCurrencyAmount(selectedAuction?.currentBid), [selectedAuction])
  const minimumBidAmount = useMemo(() => {
    if (currentBidAmount == null) {
      return null
    }

    return currentBidAmount + 1
  }, [currentBidAmount])
  const minimumBidLabel = useMemo(() => formatCurrencyAmount(minimumBidAmount), [minimumBidAmount])
  const carouselImages = useMemo(() => buildAuctionCarouselImages(selectedAuction), [selectedAuction])

  const currentImage = carouselImages[activeImageIndex] || null

  const loadAuction = useCallback(async (skipLoadingState = false) => {
    if (!productId) {
      setError(new Error('Identificador de subasta invalido.'))
      setIsLoading(false)
      return
    }

    if (!skipLoadingState) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const auction = await fetchAuctionById(productId)
      setSelectedAuction(auction)
      setError(null)
    } catch (requestError) {
      setSelectedAuction(null)
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [productId])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadAuction(true)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [loadAuction])

  useEffect(() => {
    setActiveImageIndex(0)
    setIsImageLightboxOpen(false)
  }, [productId])

  useEffect(() => {
    if (activeImageIndex >= carouselImages.length) {
      setActiveImageIndex(0)
    }
  }, [activeImageIndex, carouselImages.length])

  const submitBid = async (event) => {
    event.preventDefault()

    if (!session?.token) {
      setBidSuccess('')
      setBidError('Debes iniciar sesion para pujar.')
      return
    }

    if (!bidValue.trim()) {
      setBidSuccess('')
      setBidError('Introduce un importe para pujar.')
      return
    }

    const parsedBid = parseCurrencyAmount(bidValue)
    if (parsedBid == null) {
      setBidSuccess('')
      setBidError('Introduce una cantidad valida, por ejemplo 850 EUR.')
      return
    }

    if (minimumBidAmount != null && parsedBid < minimumBidAmount) {
      setBidSuccess('')
      setBidError(`La puja minima es ${minimumBidLabel}.`)
      return
    }

    setIsSubmittingBid(true)
    setBidError('')
    setBidSuccess('')

    try {
      const updatedAuction = await placeBid(productId, bidValue.trim(), session.token)
      setSelectedAuction(updatedAuction)
      setBidSuccess('Puja registrada correctamente.')
      setBidValue('')
    } catch (requestError) {
      setBidError(requestError.message)
    } finally {
      setIsSubmittingBid(false)
    }
  }

  if (isLoading) {
    return (
      <main>
        <section className="panel detail-page-intro">
          <h1>Cargando detalle...</h1>
        </section>
      </main>
    )
  }

  if (error || !selectedAuction) {
    return (
      <main>
        <section className="panel detail-page-intro">
          <h1>No se pudo cargar el detalle</h1>
          <p>{error?.message || 'La subasta no existe.'}</p>
          <div className="hero-actions">
            <button type="button" className="secondary-action form-button" onClick={loadAuction}>
              Reintentar
            </button>
            <Link className="secondary-action" to="/subastas">
              Volver a subastas
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      <section className="panel detail-page-intro">
        <div className="detail-page-heading">
          <h1>{selectedAuction.title}</h1>
          <Link className="secondary-action" to="/subastas">
            Volver a subastas
          </Link>
        </div>
      </section>

      <section className="detail-stack">
        <article className="panel detail-panel">
          <div className="detail-header">
            <div>
              <p>{selectedAuction.description}</p>
              <p>{selectedAuction.category}</p>
            </div>
            <div className="price-box">
              <span>Puja actual</span>
              <strong>{selectedAuction.currentBid}</strong>
              <small>Tiempo restante: {selectedAuction.timeLeft}</small>
            </div>
          </div>

          <div className="detail-layout">
            <div className="product-visual">
              {currentImage ? (
                <div className="product-carousel" aria-label="Galeria de fotos del producto">
                  <div className="carousel-main">
                    <button
                      type="button"
                      className="carousel-main-button"
                      onClick={() => setIsImageLightboxOpen(true)}
                      aria-label="Ampliar imagen"
                    >
                      <img
                        className="carousel-image"
                        src={currentImage.src}
                        alt={`${selectedAuction.title} - ${currentImage.label}`}
                      />
                    </button>
                    {carouselImages.length > 1 ? (
                      <>
                        <button
                          type="button"
                          className="carousel-control carousel-control-prev"
                          onClick={() =>
                            setActiveImageIndex((previous) =>
                              previous === 0 ? carouselImages.length - 1 : previous - 1,
                            )
                          }
                          aria-label="Imagen anterior"
                        >
                          {'<'}
                        </button>
                        <button
                          type="button"
                          className="carousel-control carousel-control-next"
                          onClick={() =>
                            setActiveImageIndex((previous) =>
                              previous === carouselImages.length - 1 ? 0 : previous + 1,
                            )
                          }
                          aria-label="Imagen siguiente"
                        >
                          {'>'}
                        </button>
                      </>
                    ) : null}
                  </div>

                  {carouselImages.length > 1 ? (
                    <div className="carousel-thumbnails" role="tablist" aria-label="Seleccion de vista">
                      {carouselImages.map((image, index) => (
                        <button
                          key={`${image.src}-${image.label}`}
                          type="button"
                          className={`carousel-thumb ${index === activeImageIndex ? 'carousel-thumb-active' : ''}`}
                          onClick={() => setActiveImageIndex(index)}
                          aria-label={`Ver imagen ${image.label}`}
                          aria-selected={index === activeImageIndex}
                          role="tab"
                        >
                          <img
                            className="carousel-thumb-image"
                            src={image.src}
                            alt={`${selectedAuction.title} - miniatura ${image.label}`}
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="visual-placeholder">Sin imagenes disponibles para este artículo.</div>
              )}
            </div>

            <div className="detail-info">
              <div className="info-card">
                <h3>Información del producto</h3>
                <ul className="feature-list compact-list">
                  <li>Estado: {selectedAuction.condition}</li>
                  <li>Vendedor: {selectedAuction.seller}</li>
                  <li>{selectedAuction.extras}</li>
                </ul>
              </div>

              <div className="info-card">
                <h3>Historial de pujas</h3>
                <ul className="bid-history">
                  {selectedAuction.bids?.length ? (
                    selectedAuction.bids.map((bid) => (
                      <li key={`${bid.bidder}-${bid.createdAt}`}>
                        <span>{bid.bidder}</span>
                        <strong>{bid.amount}</strong>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span>Sin pujas todavia</span>
                    </li>
                  )}
                </ul>
              </div>

              <form className="bid-box" onSubmit={submitBid}>
                <label>
                  Tu siguiente puja
                  <input
                    type="text"
                    value={bidValue}
                    onChange={(event) => setBidValue(event.target.value)}
                    placeholder={minimumBidLabel ? `Ej. ${minimumBidLabel}` : 'Ej. 550 EUR'}
                  />
                </label>

                {minimumBidLabel ? (
                  <p className="helper-text">Puja minima sugerida: {minimumBidLabel}</p>
                ) : null}

                {bidError ? (
                  <p className="admin-message admin-message-error" role="alert">
                    {bidError}
                  </p>
                ) : null}
                {bidSuccess ? <p className="admin-message admin-message-success">{bidSuccess}</p> : null}

                {session ? (
                  <button
                    type="submit"
                    className="primary-action form-button full-width"
                    disabled={isSubmittingBid}
                  >
                    {isSubmittingBid ? 'Enviando puja...' : 'Pujar ahora'}
                  </button>
                ) : (
                  <Link className="primary-action form-button full-width" to="/acceso">
                    Inicia sesion para pujar
                  </Link>
                )}
              </form>
            </div>
          </div>
        </article>
      </section>

      {isImageLightboxOpen && currentImage ? (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada del producto"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <div className="lightbox-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setIsImageLightboxOpen(false)}
              aria-label="Cerrar imagen ampliada"
            >
              x
            </button>
            <img
              className="lightbox-image"
              src={currentImage.src}
              alt={`${selectedAuction.title} - ${currentImage.label} ampliada`}
            />
          </div>
        </div>
      ) : null}
    </main>
  )
}

function FaqPage() {
  const [openIndex, setOpenIndex] = useState(null)

  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <main>
      <section className="panel faq-page-intro">
        <h1>Preguntas frecuentes</h1>
        <p>Información general sobre el funcionamiento de la plataforma de subastas.</p>
      </section>

      <section className="panel faq-panel">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index

          return (
            <div className="faq-item" key={item.question}>
              <button
                type="button"
                className="faq-question"
                onClick={() => toggleItem(index)}
                aria-expanded={isOpen}
              >
                <span>{item.question}</span>
                <span className={`faq-icon ${isOpen ? 'faq-icon-open' : ''}`}>{'>'}</span>
              </button>

              {isOpen ? <p className="faq-answer">{item.answer}</p> : null}
            </div>
          )
        })}
      </section>
    </main>
  )
}

function parseCurrencyAmount(value) {
  const normalized = String(value || '').replace(',', '.')
  const match = normalized.match(/\d+(?:\.\d+)?/)
  if (!match) {
    return null
  }

  const amount = Number(match[0])
  return Number.isFinite(amount) ? amount : null
}

function formatCurrencyAmount(value) {
  if (value == null) {
    return ''
  }

  const rounded = Number.parseFloat(Number(value).toFixed(2))
  return Number.isInteger(rounded) ? `${rounded} EUR` : `${rounded.toFixed(2)} EUR`
}

function App() {
  const [auctions, setAuctions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [session, setSession] = useState(getStoredSession())

  useEffect(() => {
    document.title = 'Apple Auctions'
  }, [])

  const loadAuctions = useCallback(async (skipLoadingState = false) => {
    if (!skipLoadingState) {
      setIsLoading(true)
      setError(null)
    }

    try {
      const apiAuctions = await fetchAuctions()
      setAuctions(apiAuctions)
      setError(null)
    } catch (requestError) {
      setAuctions([])
      setError(requestError)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = setTimeout(() => {
      void loadAuctions(true)
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [loadAuctions])

  useEffect(() => {
    const sessionInStorage = getStoredSession()
    if (!sessionInStorage?.token) {
      return
    }

    const timerId = setTimeout(() => {
      void getCurrentUser(sessionInStorage.token)
        .then((user) => {
          const newSession = { token: sessionInStorage.token, user }
          setSession(newSession)
          saveSession(newSession)
        })
        .catch(() => {
          setSession(null)
          clearSession()
        })
    }, 0)

    return () => {
      clearTimeout(timerId)
    }
  }, [])

  const handleAuthSuccess = (data) => {
    const newSession = { token: data.token, user: data.user }
    setSession(newSession)
    saveSession(newSession)
  }

  const handleSessionUpdate = (newSession) => {
    setSession(newSession)
    saveSession(newSession)
  }

  const handleLogout = () => {
    setSession(null)
    clearSession()
  }

  const featuredAuctions = useMemo(() => auctions.slice(0, 6), [auctions])

  return (
    <div className="page-shell">
      <Header session={session} onLogout={handleLogout} />

      <div className="app-shell main-shell">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                featuredAuctions={featuredAuctions}
                isLoading={isLoading}
                error={error}
                onRetry={loadAuctions}
              />
            }
          />
          <Route
            path="/subastas"
            element={
              <AuctionsPage
                auctions={auctions}
                isLoading={isLoading}
                error={error}
                onRetry={loadAuctions}
                session={session}
              />
            }
          />
          <Route path="/acceso" element={<AuthPage onAuthSuccess={handleAuthSuccess} />} />
          <Route path="/perfil" element={<ProfilePage session={session} onSessionUpdate={handleSessionUpdate} />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/admin" element={<Navigate to="/subastas" replace />} />
          <Route path="/producto/:productId" element={<DetailPage session={session} />} />
        </Routes>
      </div>

      <Footer />
    </div>
  )
}

export default App
