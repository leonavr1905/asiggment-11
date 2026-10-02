import { useEffect, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'book-collection-manager-books'
const MOCK_API_URL =
  import.meta.env.VITE_MOCK_API_URL || 'https://66a0b4d4afc0f9b4a29f33cb.mockapi.io/books'

const defaultBooks = [
  {
    id: 1,
    title: 'The Little Prince',
    author: 'Antoine de Saint-Exupéry',
    genre: 'Fiction',
    year: 1943,
    description: 'A philosophical tale about a young prince and the meaning of life.',
    image:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 2,
    title: 'Atomic Habits',
    author: 'James Clear',
    genre: 'Self Improvement',
    year: 2018,
    description: 'A practical guide to building good habits and breaking bad ones.',
    image:
      'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 3,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    genre: 'Classic',
    year: 1813,
    description: 'A witty and enduring novel about manners, marriage, and love.',
    image:
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80',
  },
]

const emptyForm = {
  title: '',
  author: '',
  genre: '',
  year: '',
  description: '',
  image: '',
}

function App() {
  const [books, setBooks] = useState(defaultBooks)
  const [form, setForm] = useState(emptyForm)
  const [selectedBook, setSelectedBook] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationError, setValidationError] = useState('')

  const saveLocalBooks = (nextBooks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBooks))
  }

  const getLocalBooks = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      return Array.isArray(stored) && stored.length ? stored : defaultBooks
    } catch {
      return defaultBooks
    }
  }

  const loadBooks = async () => {
    setLoading(true)

    try {
      const response = await fetch(MOCK_API_URL)
      if (!response.ok) {
        throw new Error('MockAPI unavailable')
      }

      const data = await response.json()
      const safeBooks = Array.isArray(data) && data.length ? data : getLocalBooks()
      setBooks(safeBooks)
      saveLocalBooks(safeBooks)
      setError('')
    } catch {
      const localBooks = getLocalBooks()
      setBooks(localBooks)
      saveLocalBooks(localBooks)
      setError('MockAPI is unavailable, so the app is showing the local dataset.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setValidationError('')
  }

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setValidationError('')
    setIsFormOpen(false)
  }

  const validateForm = () => {
    if (!form.title.trim()) return 'Title is required.'
    if (!form.author.trim()) return 'Author is required.'
    if (!form.genre.trim()) return 'Genre is required.'
    if (!form.year || Number(form.year) <= 0) return 'Year must be a valid number.'
    if (!form.description.trim()) return 'Description is required.'
    if (!form.image.trim()) return 'Image URL is required.'

    try {
      new URL(form.image)
    } catch {
      return 'Please enter a valid image URL.'
    }

    return ''
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const errorMessage = validateForm()
    if (errorMessage) {
      setValidationError(errorMessage)
      return
    }

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre.trim(),
      year: Number(form.year),
      description: form.description.trim(),
      image: form.image.trim(),
    }

    try {
      setLoading(true)
      const url = editingId ? `${MOCK_API_URL}/${editingId}` : MOCK_API_URL
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save book')
      }

      const savedBook = await response.json()
      let nextBooks = []

      if (editingId) {
        nextBooks = books.map((book) =>
          book.id === editingId ? { ...book, ...savedBook } : book,
        )
      } else {
        nextBooks = [savedBook, ...books]
      }

      setBooks(nextBooks)
      saveLocalBooks(nextBooks)
      resetForm()
      setError('')
    } catch {
      const fallbackId = editingId ?? Date.now()
      const localBook = {
        id: fallbackId,
        ...payload,
      }

      const nextBooks = editingId
        ? books.map((book) => (book.id === editingId ? { ...book, ...localBook } : book))
        : [localBook, ...books]

      setBooks(nextBooks)
      saveLocalBooks(nextBooks)
      resetForm()
      setError('The request could not reach MockAPI, so the book was saved locally.')
    } finally {
      setLoading(false)
    }
  }

  const openCreateForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setValidationError('')
    setIsFormOpen(true)
  }

  const handleEdit = (book) => {
    setEditingId(book.id)
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      year: String(book.year),
      description: book.description,
      image: book.image,
    })
    setValidationError('')
    setIsFormOpen(true)
  }

  const handleDelete = async (id) => {
    const confirmation = window.confirm('Are you sure you want to delete this book?')
    if (!confirmation) return

    try {
      setLoading(true)
      const response = await fetch(`${MOCK_API_URL}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Delete request failed')
      }

      const nextBooks = books.filter((book) => book.id !== id)
      setBooks(nextBooks)
      saveLocalBooks(nextBooks)
      setError('')
    } catch {
      const nextBooks = books.filter((book) => book.id !== id)
      setBooks(nextBooks)
      saveLocalBooks(nextBooks)
      setError('The book was removed locally because MockAPI was unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Book Collection Manager</p>
          <h1>Library Catalog</h1>
        </div>
        <button type="button" className="primary-button" onClick={openCreateForm}>
          + Add a Book
        </button>
      </header>

      {error && <div className="alert">{error}</div>}

      <main className="content">
        {loading && <div className="loading-text">Loading books...</div>}

        <section className="book-grid">
          {books.map((book) => (
            <article className="book-card" key={book.id}>
              <img src={book.image} alt={book.title} className="book-cover" />
              <div className="book-card-body">
                <h2>{book.title}</h2>
                <p className="meta">{book.author}</p>
                <p className="meta">{book.genre} • {book.year}</p>
                <div className="card-actions">
                  <button type="button" className="secondary-button" onClick={() => setSelectedBook(book)}>
                    View
                  </button>
                  <button type="button" className="secondary-button" onClick={() => handleEdit(book)}>
                    Edit
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDelete(book.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      {isFormOpen && (
        <div className="modal-backdrop" onClick={resetForm}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Book' : 'Add Book'}</h3>
              <button type="button" className="close-button" onClick={resetForm}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="book-form">
              <div className="input-grid">
                <label>
                  <span>Title</span>
                  <input name="title" value={form.title} onChange={handleInputChange} />
                </label>
                <label>
                  <span>Author</span>
                  <input name="author" value={form.author} onChange={handleInputChange} />
                </label>
                <label>
                  <span>Genre</span>
                  <input name="genre" value={form.genre} onChange={handleInputChange} />
                </label>
                <label>
                  <span>Year</span>
                  <input
                    name="year"
                    type="number"
                    value={form.year}
                    onChange={handleInputChange}
                  />
                </label>
              </div>

              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  rows="4"
                />
              </label>

              <label>
                <span>Image URL</span>
                <input name="image" value={form.image} onChange={handleInputChange} />
              </label>

              {validationError && <div className="validation-error">{validationError}</div>}

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingId ? 'Update Book' : 'Save Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedBook && (
        <div className="modal-backdrop" onClick={() => setSelectedBook(null)}>
          <div className="detail-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-button" onClick={() => setSelectedBook(null)}>
              ×
            </button>
            <img src={selectedBook.image} alt={selectedBook.title} className="detail-image" />
            <div className="detail-content">
              <p className="eyebrow">{selectedBook.genre}</p>
              <h3>{selectedBook.title}</h3>
              <p className="detail-author">by {selectedBook.author}</p>
              <p className="detail-year">Publication Year: {selectedBook.year}</p>
              <p className="detail-description">{selectedBook.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
